import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Link2, RefreshCw, User, Phone, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatCurrency } from '@/utils/fees'
import { formatDateTime, formatDate } from '@/utils/dates'

interface PendingUser {
  user_id: string
  full_name: string
  phone: string
  email?: string
  gender?: string
  registration_date: string
  has_legacy_account: boolean
  legacy_customer_id?: string
  legacy_balance?: number
  legacy_transactions_count?: number
}

export default function RegistrationsPage() {
  const { user } = useAuthStore()
  const [pending, setPending] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PendingUser | null>(null)
  const [action, setAction] = useState<'approve' | 'link' | 'reject' | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [saving, setSaving] = useState(false)

  const loadPending = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('view_pending_registrations')
        .select('*')
        .order('registration_date', { ascending: false })
      setPending(data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPending() }, [])

  const handleApprove = async (pendingUser: PendingUser, linkToLegacy = false) => {
    setSaving(true)
    try {
      // تحديث حالة الحساب
      const { error } = await supabase
        .from('users')
        .update({
          account_status: 'active',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', pendingUser.user_id)

      if (error) throw error

      // ربط بالحساب القديم إذا طُلب
      if (linkToLegacy && pendingUser.legacy_customer_id) {
        const { data: newCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', pendingUser.user_id)
          .single()

        if (newCustomer) {
          // نسخ البيانات من الحساب القديم
          const { data: legacy } = await supabase
            .from('customers')
            .select('*')
            .eq('id', pendingUser.legacy_customer_id)
            .single()

          if (legacy) {
            await supabase.from('customers').update({
              balance: legacy.balance,
              loyalty_points: legacy.loyalty_points,
              can_request_services: legacy.can_request_services,
              linked_old_customer_id: pendingUser.legacy_customer_id,
              total_transactions_count: legacy.total_transactions_count,
            }).eq('id', newCustomer.id)

            // نقل المعاملات
            await supabase.from('transactions')
              .update({ customer_id: newCustomer.id })
              .eq('customer_id', pendingUser.legacy_customer_id)

            // نقل التذكيرات
            await supabase.from('recharge_reminders')
              .update({ customer_id: newCustomer.id })
              .eq('customer_id', pendingUser.legacy_customer_id)
          }
        }

        // تسجيل العملية
        await supabase.from('registration_logs').insert({
          user_id: pendingUser.user_id,
          action: 'linked',
          linked_to_customer_id: pendingUser.legacy_customer_id,
          performed_by: user?.id,
        })
      } else {
        await supabase.from('registration_logs').insert({
          user_id: pendingUser.user_id,
          action: 'approved',
          performed_by: user?.id,
        })
      }

      toast.success(linkToLegacy ? 'تم الربط والموافقة بنجاح' : 'تم قبول الحساب بنجاح')
      setSelected(null)
      setAction(null)
      loadPending()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleReject = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await supabase.from('users').update({
        account_status: 'rejected',
        rejection_reason: rejectReason || null,
      }).eq('id', selected.user_id)

      await supabase.from('registration_logs').insert({
        user_id: selected.user_id,
        action: 'rejected',
        performed_by: user?.id,
        reason: rejectReason || null,
      })

      toast.success('تم رفض الطلب')
      setSelected(null)
      setAction(null)
      setRejectReason('')
      loadPending()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">طلبات التسجيل</h1>
          <p className="text-sm text-gray-400">{pending.length} طلب في الانتظار</p>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={16} />} onClick={loadPending}>
          تحديث
        </Button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text="جاري التحميل..." />
        </div>
      ) : pending.length === 0 ? (
        <Card>
          <EmptyState
            icon="✅"
            title="لا توجد طلبات معلقة"
            description="تم مراجعة كل طلبات التسجيل"
            className="py-16"
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map(p => (
            <Card key={p.user_id}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* معلومات المستخدم */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-gray-500">{p.full_name[0]}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 dark:text-white">{p.full_name}</p>
                      {p.has_legacy_account && (
                        <Badge variant="warning" size="sm">⚠️ يوجد حساب قديم</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Phone size={12} />{p.phone}</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDateTime(p.registration_date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* الحساب القديم */}
                {p.has_legacy_account && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 text-xs">
                    <p className="font-medium text-yellow-700 dark:text-yellow-400 mb-1">📊 الحساب القديم:</p>
                    <p className="text-yellow-600">الرصيد: {formatCurrency(p.legacy_balance || 0)}</p>
                    <p className="text-yellow-600">المعاملات: {p.legacy_transactions_count || 0}</p>
                  </div>
                )}

                {/* الأزرار */}
                <div className="flex gap-2 shrink-0">
                  {p.has_legacy_account && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Link2 size={14} />}
                      onClick={() => { setSelected(p); setAction('link') }}
                    >
                      ربط بالقديم
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<CheckCircle size={14} />}
                    onClick={() => { setSelected(p); setAction('approve') }}
                  >
                    موافقة
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<XCircle size={14} />}
                    onClick={() => { setSelected(p); setAction('reject') }}
                  >
                    رفض
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* نافذة تأكيد الموافقة */}
      <ConfirmDialog
        isOpen={action === 'approve' && !!selected}
        onClose={() => { setSelected(null); setAction(null) }}
        onConfirm={() => selected && handleApprove(selected, false)}
        title="تأكيد الموافقة"
        message={`هل تريد قبول حساب "${selected?.full_name}"؟`}
        confirmText="موافقة"
        variant="info"
        loading={saving}
      />

      {/* نافذة الربط */}
      <ConfirmDialog
        isOpen={action === 'link' && !!selected}
        onClose={() => { setSelected(null); setAction(null) }}
        onConfirm={() => selected && handleApprove(selected, true)}
        title="ربط بالحساب القديم"
        message={`سيتم ربط "${selected?.full_name}" بحسابه القديم وستنتقل كل بياناته (الرصيد، المعاملات، التذكيرات). هل تريد المتابعة؟`}
        confirmText="ربط والموافقة"
        variant="warning"
        loading={saving}
      />

      {/* نافذة الرفض */}
      <Modal isOpen={action === 'reject' && !!selected} onClose={() => { setSelected(null); setAction(null) }} title="رفض الطلب" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            رفض طلب تسجيل <strong>{selected?.full_name}</strong>
          </p>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              سبب الرفض (اختياري)
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="أدخل سبب الرفض..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setSelected(null); setAction(null) }}>
              إلغاء
            </Button>
            <Button variant="danger" className="flex-1" loading={saving} onClick={handleReject}>
              رفض الطلب
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
