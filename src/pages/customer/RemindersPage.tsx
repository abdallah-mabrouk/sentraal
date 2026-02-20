import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Phone, MessageCircle, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { daysUntil, getReminderLabel, formatDate } from '@/utils/dates'
import type { RechargeReminder } from '@/types'

export default function RemindersPage() {
  const { customer } = useAuthStore()
  const [reminders, setReminders] = useState<RechargeReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({
    phone_number: '',
    label: '',
    recharge_cycle_type: 'monthly' as 'monthly' | 'days',
    recharge_day: '1',
    cycle_days: '30',
    last_recharge_date: new Date().toISOString().split('T')[0],
    remind_before_days: '1',
    contact_method: 'whatsapp' as 'whatsapp' | 'call',
  })
  const [saving, setSaving] = useState(false)

  const loadReminders = async () => {
    if (!customer) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('recharge_reminders')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('is_active', true)
        .order('next_recharge_date')
      setReminders(data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReminders() }, [customer?.id])

  const handleAdd = async () => {
    if (!form.phone_number) {
      toast.error('أدخل رقم الهاتف')
      return
    }
    setSaving(true)
    try {
      await supabase.from('recharge_reminders').insert({
        customer_id: customer?.id,
        phone_number: form.phone_number,
        label: form.label || null,
        recharge_cycle_type: form.recharge_cycle_type,
        recharge_day: form.recharge_cycle_type === 'monthly' ? parseInt(form.recharge_day) : null,
        cycle_days: form.recharge_cycle_type === 'days' ? parseInt(form.cycle_days) : null,
        last_recharge_date: form.last_recharge_date,
        remind_before_days: parseInt(form.remind_before_days),
        contact_method: form.contact_method,
      })
      toast.success('تم إضافة التذكير')
      setShowAdd(false)
      setForm({
        phone_number: '', label: '', recharge_cycle_type: 'monthly',
        recharge_day: '1', cycle_days: '30',
        last_recharge_date: new Date().toISOString().split('T')[0],
        remind_before_days: '1', contact_method: 'whatsapp',
      })
      loadReminders()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await supabase.from('recharge_reminders').delete().eq('id', deleteId)
      toast.success('تم حذف التذكير')
      setDeleteId(null)
      loadReminders()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    }
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">تذكيرات الشحن</h1>
          <p className="text-sm text-gray-400">{reminders.length} تذكير</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
          إضافة
        </Button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : reminders.length === 0 ? (
        <Card>
          <EmptyState
            icon="🔔"
            title="لا توجد تذكيرات"
            description="أضف تذكير لتتلقى إشعار قبل موعد الشحن"
            action={
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
                إضافة تذكير
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {reminders.map(r => {
            const days = daysUntil(r.next_recharge_date)
            const label = getReminderLabel(days)
            return (
              <Card key={r.id}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {r.label && (
                        <span className="font-semibold text-gray-800 dark:text-white">{r.label}</span>
                      )}
                      <Badge variant={
                        label.color === 'red' ? 'danger' :
                        label.color === 'orange' ? 'warning' :
                        label.color === 'yellow' ? 'warning' : 'success'
                      } size="sm">
                        {label.text}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                      <span className="flex items-center gap-1">
                        <Phone size={12} />
                        {r.phone_number}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(r.next_recharge_date, 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {r.recharge_cycle_type === 'monthly'
                        ? `شهرياً - يوم ${r.recharge_day}`
                        : `كل ${r.cycle_days} يوم`}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteId(r.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Add */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="إضافة تذكير" size="md">
        <div className="space-y-4">
          <Input
            label="رقم الهاتف"
            type="tel"
            placeholder="01xxxxxxxxx"
            value={form.phone_number}
            onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
            hint="الرقم الذي سيُرسل إليه التذكير"
            required
          />
          <Input
            label="تسمية (اختياري)"
            placeholder="مثال: فودافون كاش"
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          />
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              نوع الدورة
            </label>
            <div className="flex gap-2">
              {(['monthly', 'days'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setForm(f => ({ ...f, recharge_cycle_type: type }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.recharge_cycle_type === type
                      ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500'
                  }`}
                >
                  {type === 'monthly' ? '📅 شهري' : '🔄 كل X يوم'}
                </button>
              ))}
            </div>
          </div>
          {form.recharge_cycle_type === 'monthly' ? (
            <Select
              label="يوم الشحن"
              options={Array.from({ length: 31 }, (_, i) => ({
                value: String(i + 1),
                label: `يوم ${i + 1}`,
              }))}
              value={form.recharge_day}
              onChange={e => setForm(f => ({ ...f, recharge_day: e.target.value }))}
            />
          ) : (
            <Input
              label="كل كم يوم"
              type="number"
              placeholder="30"
              value={form.cycle_days}
              onChange={e => setForm(f => ({ ...f, cycle_days: e.target.value }))}
            />
          )}
          <Input
            label="آخر تاريخ شحن"
            type="date"
            value={form.last_recharge_date}
            onChange={e => setForm(f => ({ ...f, last_recharge_date: e.target.value }))}
          />
          <Input
            label="التذكير قبلها بكم يوم"
            type="number"
            placeholder="1"
            value={form.remind_before_days}
            onChange={e => setForm(f => ({ ...f, remind_before_days: e.target.value }))}
          />
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              طريقة التواصل
            </label>
            <div className="flex gap-2">
              {(['whatsapp', 'call'] as const).map(method => (
                <button
                  key={method}
                  onClick={() => setForm(f => ({ ...f, contact_method: method }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.contact_method === method
                      ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500'
                  }`}
                >
                  {method === 'whatsapp' ? '💬 واتساب' : '📞 اتصال'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>
              إلغاء
            </Button>
            <Button className="flex-1" loading={saving} onClick={handleAdd}>
              إضافة
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="حذف التذكير"
        message="هل تريد حذف هذا التذكير؟"
        confirmText="حذف"
        variant="danger"
      />
    </div>
  )
}
