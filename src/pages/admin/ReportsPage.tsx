import { useState, useEffect } from 'react'
import { Download, TrendingUp, TrendingDown, DollarSign, Users, ArrowLeftRight } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useBranchStore } from '@/stores/branchStore'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/utils/fees'
import { formatDate } from '@/utils/dates'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function ReportsPage() {
  const { getSelectedBranch } = useBranchStore()
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'custom'>('monthly')
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  const [stats, setStats] = useState({
    totalProfit: 0,
    totalTransactions: 0,
    totalExpenses: 0,
    netProfit: 0,
    avgTransactionValue: 0,
    uniqueCustomers: 0,
  })

  const [dailyData, setDailyData] = useState<any[]>([])
  const [byOperationType, setByOperationType] = useState<any[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])

  const loadReport = async () => {
    setLoading(true)
    try {
      const branch = getSelectedBranch()

      // Transactions
      let txQuery = supabase
        .from('transactions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
      if (branch) txQuery = txQuery.eq('branch_id', branch.id)
      const { data: transactions } = await txQuery

      // Expenses
      let expQuery = supabase
        .from('expenses')
        .select('amount')
        .gte('date', startDate)
        .lte('date', endDate)
      if (branch) expQuery = expQuery.eq('branch_id', branch.id)
      const { data: expenses } = await expQuery

      const totalProfit = transactions?.reduce((sum, t) => sum + t.profit, 0) || 0
      const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0
      const totalAmount = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0
      const uniqueCustomers = new Set(transactions?.map(t => t.customer_id).filter(Boolean)).size

      setStats({
        totalProfit,
        totalTransactions: transactions?.length || 0,
        totalExpenses,
        netProfit: totalProfit - totalExpenses,
        avgTransactionValue: transactions?.length ? totalAmount / transactions.length : 0,
        uniqueCustomers,
      })

      // Daily chart
      const byDate: Record<string, { profit: number; count: number }> = {}
      transactions?.forEach(t => {
        if (!byDate[t.date]) byDate[t.date] = { profit: 0, count: 0 }
        byDate[t.date].profit += t.profit
        byDate[t.date].count++
      })
      setDailyData(
        Object.entries(byDate)
          .map(([date, v]) => ({ date: formatDate(date, 'dd/MM'), profit: Math.round(v.profit), count: v.count }))
          .sort((a, b) => a.date.localeCompare(b.date))
      )

      // By operation type
      const byOp: Record<string, number> = {}
      transactions?.forEach(t => {
        byOp[t.operation_type] = (byOp[t.operation_type] || 0) + t.profit
      })
      setByOperationType(
        Object.entries(byOp).map(([type, profit]) => ({
          name: type === 'transfer' ? 'تحويل' : type === 'withdrawal' ? 'سحب' : 'شحن',
          value: Math.round(profit),
        }))
      )

      // Top customers
      const byCustomer: Record<string, { name: string; profit: number; count: number }> = {}
      transactions?.forEach(t => {
        if (!t.customer_id) return
        const id = t.customer_id
        if (!byCustomer[id]) {
          byCustomer[id] = {
            name: (t.customer as any)?.user?.full_name || 'عميل',
            profit: 0,
            count: 0,
          }
        }
        byCustomer[id].profit += t.profit
        byCustomer[id].count++
      })
      setTopCustomers(
        Object.values(byCustomer)
          .sort((a, b) => b.profit - a.profit)
          .slice(0, 5)
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReport() }, [startDate, endDate])

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">التقارير</h1>
          <p className="text-sm text-gray-400">
            من {formatDate(startDate)} إلى {formatDate(endDate)}
          </p>
        </div>
        <Button variant="outline" size="sm" icon={<Download size={14} />}>
          تصدير PDF
        </Button>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap gap-3">
          <Select
            options={[
              { value: 'daily', label: 'اليوم' },
              { value: 'monthly', label: 'هذا الشهر' },
              { value: 'custom', label: 'فترة مخصصة' },
            ]}
            value={reportType}
            onChange={e => {
              const type = e.target.value as any
              setReportType(type)
              if (type === 'daily') {
                const today = new Date().toISOString().split('T')[0]
                setStartDate(today)
                setEndDate(today)
              } else if (type === 'monthly') {
                const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                setStartDate(start.toISOString().split('T')[0])
                setEndDate(new Date().toISOString().split('T')[0])
              }
            }}
            className="w-36"
          />
          {reportType === 'custom' && (
            <>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-40"
              />
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-40"
              />
            </>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text="جاري إنشاء التقرير..." />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">إجمالي الأرباح</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalProfit)}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} className="text-green-600" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">المصروفات</p>
                  <p className="text-xl font-bold text-red-500">{formatCurrency(stats.totalExpenses)}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <TrendingDown size={20} className="text-red-500" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">صافي الربح</p>
                  <p className={`text-xl font-bold ${stats.netProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {formatCurrency(stats.netProfit)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <DollarSign size={20} className="text-blue-600" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">المعاملات</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">{stats.totalTransactions}</p>
                  <p className="text-xs text-gray-400 mt-1">{stats.uniqueCustomers} عميل</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <ArrowLeftRight size={20} className="text-purple-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Daily Profit */}
            <Card>
              <CardHeader>
                <CardTitle>الأرباح اليومية</CardTitle>
              </CardHeader>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
                  <YAxis tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
                  <Tooltip contentStyle={{ fontFamily: 'Cairo', fontSize: 12, borderRadius: 12 }} />
                  <Bar dataKey="profit" fill="#3b82f6" name="الربح (ج)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* By Type */}
            <Card>
              <CardHeader>
                <CardTitle>الأرباح حسب نوع العملية</CardTitle>
              </CardHeader>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={byOperationType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={entry => `${entry.name} (${formatCurrency(entry.value)})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {byOperationType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontFamily: 'Cairo', fontSize: 12, borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle>أفضل 5 عملاء</CardTitle>
            </CardHeader>
            {topCustomers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">لا توجد بيانات</p>
            ) : (
              <div className="space-y-2">
                {topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.count} معاملة</p>
                      </div>
                    </div>
                    <p className="font-bold text-green-600">{formatCurrency(c.profit)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
