import { useState, useEffect } from 'react'
import { Calendar, Download, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/fees'
import { formatDate, formatDateTime } from '@/utils/dates'
import type { Transaction } from '@/types'

const OP_LABELS = {
  transfer: { label: 'تحويل', color: 'info' as const },
  withdrawal: { label: 'سحب', color: 'warning' as const },
  recharge: { label: 'شحن', color: 'success' as const },
}

export default function StatementPage() {
  const { customer } = useAuthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7))
  const [filterOp, setFilterOp] = useState('')

  useEffect(() => {
    if (!customer) return
    const load = async () => {
      setLoading(true)
      try {
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(100)

        if (filterMonth) {
          query = query.gte('date', `${filterMonth}-01`).lte('date', `${filterMonth}-31`)
        }
        if (filterOp) {
          query = query.eq('operation_type', filterOp)
        }

        const { data } = await query
        setTransactions(data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customer?.id, filterMonth, filterOp])

  if (!customer) return null

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
  const totalCharged = transactions.reduce((sum, t) => sum + t.total_charged, 0)

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">كشف الحساب</h1>
        <p className="text-sm text-gray-400">{transactions.length} معاملة</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-gray-400 mb-1">إجمالي المبالغ</p>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalAmount)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400 mb-1">المدفوع الكلي</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(totalCharged)}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex gap-3">
          <Input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            icon={<Calendar size={16} />}
            className="flex-1"
          />
          <Select
            options={[
              { value: '', label: 'الكل' },
              { value: 'transfer', label: 'تحويل' },
              { value: 'withdrawal', label: 'سحب' },
              { value: 'recharge', label: 'شحن' },
            ]}
            value={filterOp}
            onChange={e => setFilterOp(e.target.value)}
            className="w-32"
          />
        </div>
      </Card>

      {/* List */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : transactions.length === 0 ? (
        <Card>
          <EmptyState icon="📋" title="لا توجد معاملات" description="لم يتم تسجيل أي معاملة في هذه الفترة" />
        </Card>
      ) : (
        <div className="space-y-2">
          {transactions.map(t => {
            const op = OP_LABELS[t.operation_type]
            return (
              <Card key={t.id} padding="sm">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={op.color} size="sm">{op.label}</Badge>
                      <span className="text-xs text-gray-400">{formatDate(t.date, 'dd/MM/yyyy')}</span>
                    </div>
                    <p className="font-medium text-gray-800 dark:text-white">{t.account_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(t.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {formatCurrency(t.amount)}
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      مدفوع: {formatCurrency(t.total_charged)}
                    </p>
                  </div>
                </div>
                {t.notes && (
                  <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    {t.notes}
                  </p>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
