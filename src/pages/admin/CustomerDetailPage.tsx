import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Edit, DollarSign, Gift, Bell, FileText, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/utils/fees'
import { formatDateTime, timeAgo } from '@/utils/dates'
import type { Customer, Transaction } from '@/types'

const TIER_LABELS = {
  vip: { label: 'VIP 💎', color: 'purple' as const },
  active: { label: 'نشط ⚡', color: 'success' as const },
  normal: { label: 'عادي', color: 'default' as const },
  inactive: { label: 'غير نشط', color: 'danger' as const },
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [custRes, txRes] = await Promise.all([
        supabase
          .from('customers')
          .select('*, user:users(*), branch:branches(*)')
          .eq('id', id!)
          .single(),
        supabase
          .from('transactions')
          .select('*')
          .eq('customer_id', id!)
          .order('created_at', { ascending: false })
          .limit(20),
      ])
      setCustomer(custRes.data)
      setTransactions(txRes.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (id) loadData() }, [id])

  const handleAdjustBalance = async () => {
    if (!adjustAmount || isNaN(Number(adjustAmount))) {
      toast.error('أدخل مبلغ صحيح')
      return
    }
    setSaving(true)
    try {
      const amount = parseFloat(adjustAmount)
      await supabase
        .from('customers')
        .update({ balance: (customer!.balance + amount) })
        .eq('id', id!)

      // تسجيل في المعاملات للتوثيق
      await supabase.from('transactions').insert({
        customer_id: id,
        branch_id: customer!.branch_id,
        date: new Date().toISOString().split('T')[0],
        account_type: 'cash',
        account_id: id!, // رمزي
        account_name: 'تعديل يدوي',
        operation_type: 'recharge',
        amount: Math.abs(amount),
        wallet_fees: 0,
        service_fees: 0,
        total_charged: amount,
        profit: 0,
        notes: adjustReason || 'تعديل يدوي على الرصيد',
      })

      toast.success('تم تعديل الرصيد')
      setShowAdjust(false)
      setAdjustAmount('')
      setAdjustReason('')
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const toggleServicePermission = async () => {
    try {
      await supabase
        .from('customers')
        .update({ can_request_services: !customer!.can_request_services })
        .eq('id', id!)
      toast.success('تم التحديث')
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner text="جاري التحميل..." />
    </div>
  )

  if (!customer) return (
    <div className="p-4 text-center text-gray-400">
      <p>لم يتم العثور على العميل</p>
    </div>
  )

  const user = customer.user as any
  const tier = TIER_LABELS[customer.tier]

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate('/admin/customers')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowRight size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            {user?.full_name || 'عميل مباشر'}
          </h1>
          <p className="text-sm text-gray-400">{user?.phone || customer.id.slice(0, 12)}</p>
        </div>
        <Badge variant={tier.color}>{tier.label}</Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">الرصيد الحالي</p>
            <p className={`text-2xl font-bold ${customer.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCurrency(customer.balance)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">نقاط الولاء</p>
            <p className="text-2xl font-bold text-blue-600">{customer.loyalty_points}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">المعاملات</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {customer.total_transactions_count}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">كود الإحالة</p>
            <p className="text-lg font-mono font-bold text-purple-600">
              {customer.referral_code || '---'}
            </p>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={<DollarSign size={14} />} onClick={() => setShowAdjust(true)}>
            تعديل الرصيد
          </Button>
          <Button
            size="sm"
            variant={customer.can_request_services ? 'danger' : 'primary'}
            icon={<Bell size={14} />}
            onClick={toggleServicePermission}
          >
            {customer.can_request_services ? 'إيقاف' : 'تفعيل'} طلب الخدمات بدون رصيد
          </Button>
          <Button size="sm" variant="outline" icon={<Gift size={14} />}>
            إضافة نقاط ولاء
          </Button>
        </div>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader><CardTitle>معلومات العميل</CardTitle></CardHeader>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 mb-1">البريد الإلكتروني</p>
            <p className="text-gray-800 dark:text-white">{user?.email || '---'}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">الجنس</p>
            <p className="text-gray-800 dark:text-white">
              {user?.gender === 'male' ? 'ذكر' : user?.gender === 'female' ? 'أنثى' : '---'}
            </p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">المنطقة</p>
            <p className="text-gray-800 dark:text-white">{customer.area || '---'}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">الفرع</p>
            <p className="text-gray-800 dark:text-white">
              {(customer.branch as any)?.name || '---'}
            </p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">تاريخ التسجيل</p>
            <p className="text-gray-800 dark:text-white">{timeAgo(customer.created_at)}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">آخر معاملة</p>
            <p className="text-gray-800 dark:text-white">
              {customer.last_transaction_date ? timeAgo(customer.last_transaction_date) : '---'}
            </p>
          </div>
        </div>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>آخر المعاملات</CardTitle>
          <Button size="sm" variant="ghost">عرض الكل</Button>
        </CardHeader>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">لا توجد معاملات</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-700 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{t.account_name}</p>
                  <p className="text-xs text-gray-400">
                    {t.operation_type === 'transfer' ? 'تحويل' : t.operation_type === 'withdrawal' ? 'سحب' : 'شحن'}
                    {' • '}
                    {formatDateTime(t.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {formatCurrency(t.amount)}
                  </p>
                  <p className="text-xs text-green-600">ربح: {formatCurrency(t.profit)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal تعديل الرصيد */}
      <Modal isOpen={showAdjust} onClose={() => setShowAdjust(false)} title="تعديل الرصيد" size="sm">
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-sm">
            <p className="text-blue-700 dark:text-blue-400">
              الرصيد الحالي: <strong>{formatCurrency(customer.balance)}</strong>
            </p>
          </div>
          <Input
            label="المبلغ"
            type="number"
            placeholder="أدخل مبلغ موجب للإضافة أو سالب للخصم"
            value={adjustAmount}
            onChange={e => setAdjustAmount(e.target.value)}
            hint="مثال: 100 للإضافة، -50 للخصم"
            required
          />
          <Input
            label="السبب (اختياري)"
            placeholder="سبب التعديل..."
            value={adjustReason}
            onChange={e => setAdjustReason(e.target.value)}
          />
          {adjustAmount && !isNaN(Number(adjustAmount)) && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-sm">
              <p className="text-green-700 dark:text-green-400">
                الرصيد الجديد: <strong>{formatCurrency(customer.balance + parseFloat(adjustAmount))}</strong>
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdjust(false)}>
              إلغاء
            </Button>
            <Button className="flex-1" loading={saving} onClick={handleAdjustBalance}>
              تأكيد التعديل
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
