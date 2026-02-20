import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight, TrendingUp, Users, Receipt,
  Bell, AlertTriangle, CheckCircle, Clock, RefreshCw
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useBranchStore } from '@/stores/branchStore'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/utils/fees'
import { formatDate } from '@/utils/dates'

interface Stats {
  today_transactions: number
  today_profit: number
  today_expenses: number
  new_customers: number
  pending_requests: number
  pending_registrations: number
  reminders_today: number
  weekly_profit: { date: string; profit: number; count: number }[]
  wallet_alerts: { name: string; type: string; percent: number; used: number; limit: number }[]
  machines: { name: string; balance: number }[]
  wallets: { name: string; balance: number }[]
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { getSelectedBranch } = useBranchStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStats = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const branch = getSelectedBranch()

      // معاملات اليوم
      const txQuery = supabase
        .from('transactions')
        .select('profit, amount')
        .eq('date', today)
      if (branch) txQuery.eq('branch_id', branch.id)
      const { data: txData } = await txQuery

      const today_profit = txData?.reduce((sum, t) => sum + (t.profit || 0), 0) || 0
      const today_transactions = txData?.length || 0

      // مصروفات اليوم
      const { data: expData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('date', today)
      const today_expenses = expData?.reduce((sum, e) => sum + e.amount, 0) || 0

      // عملاء جدد اليوم
      const { count: new_customers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer')
        .gte('created_at', today)

      // طلبات معلقة
      const { count: pending_requests } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // تسجيلات معلقة
      const { count: pending_registrations } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('account_status', 'pending')
        .eq('role', 'customer')

      // تذكيرات اليوم
      const { count: reminders_today } = await supabase
        .from('view_upcoming_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('is_due_today', true)

      // أرباح آخر 7 أيام
      const days7ago = new Date()
      days7ago.setDate(days7ago.getDate() - 6)
      const { data: weeklyData } = await supabase
        .from('transactions')
        .select('date, profit')
        .gte('date', days7ago.toISOString().split('T')[0])
        .order('date')

      const weeklyMap: Record<string, { profit: number; count: number }> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        weeklyMap[key] = { profit: 0, count: 0 }
      }
      weeklyData?.forEach(t => {
        if (weeklyMap[t.date]) {
          weeklyMap[t.date].profit += t.profit || 0
          weeklyMap[t.date].count++
        }
      })
      const weekly_profit = Object.entries(weeklyMap).map(([date, v]) => ({
        date: formatDate(date, 'dd/MM'),
        profit: Math.round(v.profit),
        count: v.count,
      }))

      // حالة المحافظ
      const { data: walletData } = await supabase
        .from('view_wallet_status')
        .select('*')
        .eq('is_active', true)

      const wallet_alerts = walletData?.flatMap(w => {
        const alerts = []
        if (w.daily_withdrawal_limit > 0 && w.daily_withdrawal_percent > 70)
          alerts.push({ name: w.name, type: 'سحب يومي', percent: w.daily_withdrawal_percent, used: w.daily_withdrawals_used, limit: w.daily_withdrawal_limit })
        if (w.daily_transfer_limit > 0 && w.daily_transfer_percent > 70)
          alerts.push({ name: w.name, type: 'تحويل يومي', percent: w.daily_transfer_percent, used: w.daily_transfers_used, limit: w.daily_transfer_limit })
        return alerts
      }) || []

      // الماكينات
      const { data: machineData } = await supabase
        .from('machines')
        .select('name, current_balance')
        .eq('is_active', true)
      const machines = machineData?.map(m => ({ name: m.name, balance: m.current_balance })) || []

      // المحافظ
      const wallets = walletData?.map(w => ({ name: w.name, balance: w.current_balance })) || []

      setStats({
        today_transactions, today_profit, today_expenses,
        new_customers: new_customers || 0,
        pending_requests: pending_requests || 0,
        pending_registrations: pending_registrations || 0,
        reminders_today: reminders_today || 0,
        weekly_profit, wallet_alerts, machines, wallets,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStats() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner text="جاري تحميل البيانات..." />
    </div>
  )

  const net_profit = (stats?.today_profit || 0) - (stats?.today_expenses || 0)

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">لوحة التحكم</h1>
          <p className="text-sm text-gray-400">{formatDate(new Date(), 'EEEE، dd MMMM yyyy')}</p>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={16} />} onClick={loadStats}>
          تحديث
        </Button>
      </div>

      {/* Alerts */}
      {(stats!.pending_registrations > 0 || stats!.pending_requests > 0 || stats!.reminders_today > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {stats!.pending_registrations > 0 && (
            <button
              onClick={() => navigate('/admin/registrations')}
              className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Users size={16} className="text-blue-600" />
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600 font-medium">{stats!.pending_registrations} طلب تسجيل</p>
                <p className="text-xs text-blue-400">في انتظار المراجعة</p>
              </div>
            </button>
          )}
          {stats!.pending_requests > 0 && (
            <button
              onClick={() => navigate('/admin/requests')}
              className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl hover:bg-yellow-100 transition-colors"
            >
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <Clock size={16} className="text-yellow-600" />
              </div>
              <div className="text-right">
                <p className="text-xs text-yellow-600 font-medium">{stats!.pending_requests} طلب خدمة</p>
                <p className="text-xs text-yellow-400">في انتظار الموافقة</p>
              </div>
            </button>
          )}
          {stats!.reminders_today > 0 && (
            <button
              onClick={() => navigate('/admin/reminders')}
              className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl hover:bg-green-100 transition-colors"
            >
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Bell size={16} className="text-green-600" />
              </div>
              <div className="text-right">
                <p className="text-xs text-green-600 font-medium">{stats!.reminders_today} تذكير شحن</p>
                <p className="text-xs text-green-400">مطلوب اليوم</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">معاملات اليوم</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats!.today_transactions}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <ArrowLeftRight size={20} className="text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">أرباح اليوم</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(stats!.today_profit)}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">مصروفات اليوم</p>
              <p className="text-xl font-bold text-red-500">{formatCurrency(stats!.today_expenses)}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <Receipt size={20} className="text-red-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">صافي الربح</p>
              <p className={`text-xl font-bold ${net_profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatCurrency(net_profit)}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${net_profit >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {net_profit >= 0
                ? <CheckCircle size={20} className="text-green-600" />
                : <AlertTriangle size={20} className="text-red-500" />}
            </div>
          </div>
        </Card>
      </div>

      {/* Chart + Wallets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>أرباح آخر 7 أيام</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats!.weekly_profit}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
              <YAxis tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
              <Tooltip
                formatter={(v: number) => [`${v} ج`, 'الربح']}
                contentStyle={{ fontFamily: 'Cairo', fontSize: 12, borderRadius: 12 }}
              />
              <Area type="monotone" dataKey="profit" stroke="#2563eb" fill="url(#profitGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Wallet Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>تنبيهات المحافظ</CardTitle>
          </CardHeader>
          {stats!.wallet_alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle size={32} className="text-green-400 mb-2" />
              <p className="text-sm text-gray-400">كل المحافظ بخير</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats!.wallet_alerts.map((alert, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-300">{alert.name} - {alert.type}</span>
                    <Badge variant={alert.percent >= 90 ? 'danger' : alert.percent >= 80 ? 'warning' : 'default'} size="sm">
                      {alert.percent}%
                    </Badge>
                  </div>
                  <ProgressBar value={alert.percent} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Machines & Wallets Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>أرصدة الماكينات</CardTitle></CardHeader>
          {stats!.machines.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">لا توجد ماكينات</p>
          ) : (
            <div className="space-y-2">
              {stats!.machines.map((m, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{m.name}</span>
                  <span className="font-semibold text-gray-800 dark:text-white">{formatCurrency(m.balance)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>أرصدة المحافظ</CardTitle></CardHeader>
          {stats!.wallets.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">لا توجد محافظ</p>
          ) : (
            <div className="space-y-2">
              {stats!.wallets.map((w, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{w.name}</span>
                  <span className="font-semibold text-gray-800 dark:text-white">{formatCurrency(w.balance)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
