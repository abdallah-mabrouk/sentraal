import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatCurrency } from '@/utils/fees'
import { formatDateTime, timeAgo } from '@/utils/dates'
import type { ServiceRequest } from '@/types'

export default function ServiceRequestsPage() {
  const { user } = useAuthStore()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [selected, setSelected] = useState<ServiceRequest | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [saving, setSaving] = useState(false)

  const loadRequests = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('service_requests')
        .select('*, customer:customers(*, user:users(*))')
        .order('requested_at', { ascending: false })
        .limit(100)

      if (filter === 'pending') {
        query = query.eq('status', 'pending')
      }

      const { data } = await query
      setRequests(data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRequests() }, [filter])

  const handleApprove = async (request: ServiceRequest) => {
    setSaving(true)
    try {
      // تحديث حالة الطلب
      await supabase
        .from('service_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq('id', request.id)

      // يمكن هنا إنشاء معاملة تلقائياً
      // أو إبقاء الطلب موافق عليه فقط ليتم تنفيذه يدوياً

      toast.success('تم قبول الطلب')
      setSelected(null)
      setAction(null)
      loadRequests()
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
      await supabase
        .from('service_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
          rejection_reason: rejectReason || null,
        })
        .eq('id', selected.id)

      toast.success('تم رفض الطلب')
      setSelected(null)
      setAction(null)
      setRejectReason('')
      loadRequests()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">طلبات الخدمة</h1>
          <p className="text-sm text-gray-400">{pendingCount} طلب معلق</p>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={loadRequests}>
          تحديث
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          ⏳ المعلقة ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          الكل ({requests.length})
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text="جاري التحميل..." />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <EmptyState
            icon="✅"
            title={filter === 'pending' ? 'لا توجد طلبات معلقة' : 'لا توجد طلبات'}
            description={filter === 'pending' ? 'تم معالجة كل الطلبات' : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const customer = req.customer as any
            const user = customer?.user
            const hasSufficientBalance =
              customer?.can_request_services ||
              (customer?.balance >= (req.amount + req.estimated_fees))

            return (
              <Card key={req.id}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-blue-600 font-bold">{user?.full_name?.[0]}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{user?.full_name}</p>
                      <p className="text-xs text-gray-400">{user?.phone}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      req.status === 'pending' ? 'warning' :
                      req.status === 'approved' ? 'info' :
                      req.status === 'completed' ? 'success' : 'danger'
                    }
                  >
                    {req.status === 'pending' ? 'معلق' :
                     req.status === 'approved' ? 'موافق عليه' :
                     req.status === 'completed' ? 'مكتمل' : 'مرفوض'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-gray-400 mb-0.5">النوع</p>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {req.request_type === 'transfer' ? 'تحويل' : 'سحب'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">المبلغ</p>
                    <p className="font-semibold text-blue-600">{formatCurrency(req.amount)}</p>
                  </div>
                  {req.target_phone && (
                    <div>
                      <p className="text-gray-400 mb-0.5">إلى رقم</p>
                      <p className="text-gray-700 dark:text-gray-300">{req.target_phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400 mb-0.5">الرسوم المتوقعة</p>
                    <p className="text-gray-700 dark:text-gray-300">{formatCurrency(req.estimated_fees)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-400 mb-0.5">رصيد العميل</p>
                    <p className={`font-medium ${hasSufficientBalance ? 'text-green-600' : 'text-red-500'}`}>
                      {formatCurrency(customer?.balance || 0)}
                      {!hasSufficientBalance && ' (غير كافٍ)'}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mb-3">
                  طلب {timeAgo(req.requested_at)}
                </div>

                {req.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      icon={<CheckCircle size={14} />}
                      onClick={() => { setSelected(req); setAction('approve') }}
                    >
                      قبول
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      icon={<XCircle size={14} />}
                      onClick={() => { setSelected(req); setAction('reject') }}
                    >
                      رفض
                    </Button>
                  </div>
                )}

                {req.status === 'rejected' && req.rejection_reason && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400">
                    <strong>سبب الرفض:</strong> {req.rejection_reason}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Approve */}
      <ConfirmDialog
        isOpen={action === 'approve' && !!selected}
        onClose={() => { setSelected(null); setAction(null) }}
        onConfirm={() => selected && handleApprove(selected)}
        title="تأكيد القبول"
        message={`قبول طلب ${selected?.request_type === 'transfer' ? 'تحويل' : 'سحب'} ${formatCurrency(selected?.amount || 0)}؟`}
        confirmText="قبول"
        variant="info"
        loading={saving}
      />

      {/* Reject */}
      <Modal isOpen={action === 'reject' && !!selected} onClose={() => { setSelected(null); setAction(null) }} title="رفض الطلب" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            رفض طلب {selected?.request_type === 'transfer' ? 'تحويل' : 'سحب'}{' '}
            <strong>{formatCurrency(selected?.amount || 0)}</strong>
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
