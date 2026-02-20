import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, DollarSign, Gift, Bell, ArrowLeftRight, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/utils/fees'
import { formatDateTime } from '@/utils/dates'
import type { Customer, Transaction, Achievement } from '@/types'

const TIER_LABELS = {
  vip: { label: 'VIP 💎', color: 'purple' as const },
  active: { label: 'نشط ⚡', color: 'success' as const },
  normal: { label: 'عادي', color: 'default' as const },
  inactive: { label: 'غير نشط', color: 'danger' as const },
}

export default function HomePage() {
  const navigate = useNavigate()
  const { customer } = useAuthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!customer) return
    const load = async () => {
      setLoading(true)
      try {
        const [txRes, achRes] = await Promise.all([
          supabase
            .from('transactions')
            .select('*')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('achievements')
            .select('*')
            .eq('customer_id', customer.id)
            .eq('is_new', true)
            .order('achieved_at', { ascending: false })
            .limit(3),
        ])
        setTransactions(txRes.data || [])
        setAchievements(achRes.data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customer?.id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner />
    </div>
  )

  if (!customer) return null

  const tier = TIER_LABELS[customer.tier]

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            مرحباً، {(customer.user as any)?.full_name?.split(' ')[0] || 'عميل'} 👋
          </h2>
          <p className="text-sm text-gray-400">كيف يمكننا مساعدتك اليوم؟</p>
        </div>
        <button onClick={() => navigate('/app/notifications')}>
          <Bell size={22} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-blue-600 to-purple-600 text-white border-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-blue-100 text-sm mb-1">رصيدك الحالي</p>
            <p className="text-3xl font-bold">{formatCurrency(customer.balance, '')}</p>
            <p className="text-blue-100 text-sm mt-1">جنيه مصري</p>
          </div>
          <Badge variant="purple" className="bg-white/20 text-white border-0">
            {tier.label}
          </Badge>
        </div>
        <div className="flex gap-4 pt-3 border-t border-white/20">
          <div className="flex-1">
            <p className="text-blue-100 text-xs">نقاط الولاء</p>
            <p className="font-semibold">{customer.loyalty_points} نقطة</p>
          </div>
          <div className="flex-1">
            <p className="text-blue-100 text-xs">المعاملات</p>
            <p className="font-semibold">{customer.total_transactions_count}</p>
          </div>
          <div className="flex-1">
            <p className="text-blue-100 text-xs">كود الإحالة</p>
            <p className="font-semibold font-mono text-sm">{customer.referral_code || '---'}</p>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/app/services')}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl mx-auto mb-2 flex items-center justify-center text-2xl">
            🛠️
          </div>
          <p className="font-semibold text-gray-800 dark:text-white text-sm">طلب خدمة</p>
        </button>
        <button
          onClick={() => navigate('/app/statement')}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl mx-auto mb-2 flex items-center justify-center text-2xl">
            📊
          </div>
          <p className="font-semibold text-gray-800 dark:text-white text-sm">كشف الحساب</p>
        </button>
        <button
          onClick={() => navigate('/app/products')}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl mx-auto mb-2 flex items-center justify-center text-2xl">
            🛍️
          </div>
          <p className="font-semibold text-gray-800 dark:text-white text-sm">المنتجات</p>
        </button>
        <button
          onClick={() => navigate('/app/reminders')}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl mx-auto mb-2 flex items-center justify-center text-2xl">
            🔔
          </div>
          <p className="font-semibold text-gray-800 dark:text-white text-sm">التذكيرات</p>
        </button>
      </div>

      {/* New Achievements */}
      {achievements.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-white">🏆 إنجازات جديدة</h3>
          </div>
          <div className="space-y-2">
            {achievements.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <span className="text-2xl">🎉</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {a.achievement_type === 'first_transaction' ? 'أول معاملة!' :
                     a.achievement_type === 'transactions_10' ? '10 معاملات!' :
                     a.achievement_type === 'transactions_50' ? '50 معاملة!' :
                     'إنجاز جديد!'}
                  </p>
                </div>
                <Badge variant="warning" size="sm">جديد</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 dark:text-white">آخر المعاملات</h3>
          <button
            onClick={() => navigate('/app/statement')}
            className="text-xs text-blue-600 flex items-center gap-1"
          >
            عرض الكل
            <ChevronRight size={14} className="rtl-flip" />
          </button>
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">لا توجد معاملات بعد</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <ArrowLeftRight size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                    {t.account_name}
                  </p>
                  <p className="text-xs text-gray-400">{formatDateTime(t.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {formatCurrency(t.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
