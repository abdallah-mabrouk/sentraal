import { useState, useEffect } from 'react'
import { Plus, Phone, MessageCircle, Calendar, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { daysUntil, getReminderLabel, formatDate } from '@/utils/dates'
import type { RechargeReminder, Customer } from '@/types'

export default function RemindersPage() {
  const [reminders, setReminders] = useState<RechargeReminder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all')
  const [form, setForm] = useState({
    customer_id: '',
    phone_number: '',
    recharge_cycle_type: 'monthly' as 'monthly' | 'days',
    recharge_day: '1',
    cycle_days: '30',
    last_recharge_date: new Date().toISOString().split('T')[0],
    remind_before_days: '1',
    contact_method: 'whatsapp' as 'whatsapp' | 'call',
  })
  const [saving, setSaving] = useState(false)

  const loadReminders = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('recharge_reminders')
        .select('*, customer:customers(*, user:users(*))')
        .eq('is_active', true)
        .order('next_recharge_date')
        .limit(100)

      const enriched = (data || []).map(r => ({
        ...r,
        days_remaining: daysUntil(r.next_recharge_date),
        is_due_today: daysUntil(r.next_recharge_date) === 0,
        is_overdue: daysUntil(r.next_recharge_date) < 0,
      }))
      setReminders(enriched as any)
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*, user:users(*)')
      .eq('user:users.account_status', 'active')
      .limit(200)
    setCustomers(data || [])
  }

  useEffect(() => {
    loadReminders()
    loadCustomers()
  }, [])

  const handleAdd = async () => {
    if (!form.customer_id || !form.phone_number) {
      toast.error('اختر العميل وأدخل رقم الهاتف')
      return
    }
    setSaving(true)
    try {
      await supabase.from('recharge_reminders').insert({
        customer_id: form.customer_id,
        phone_number: form.phone_number,
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
        customer_id: '', phone_number: '',
        recharge_cycle_type: 'monthly',
        recharge_day: '1', cycle_days: '30',
        last_recharge_date: new Date().toISOString().split('T')[0],
        remind_before_days: '1',
        contact_method: 'whatsapp',
      })
      loadReminders()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('recharge_reminders').update({ is_active: !current }).eq('id', id)
    loadReminders()
  }

  const filtered = reminders.filter(r => {
    if (filter === 'today') return r.is_due_today
    if (filter === 'week') return r.days_remaining !== undefined && r.days_remaining <= 7
    return true
  })

  const dueToday = reminders.filter(r => r.is_due_today).length
  const dueWeek = reminders.filter(r => r.days_remaining !== undefined && r.days_remaining <= 7).length

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">تذكيرات الشحن</h1>
          <p className="text-sm text-gray-400">{reminders.length} تذكير نشط</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
          إضافة تذكير
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          الكل ({reminders.length})
        </button>
        <button
          onClick={() => setFilter('today')}
          className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            filter === 'today' ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          🔥 اليوم ({dueToday})
        </button>
        <button
          onClick={() => setFilter('week')}
          className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            filter === 'week' ? 'bg-yellow-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          ⏰ هذا الأسبوع ({dueWeek})
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text="جاري التحميل..." />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon="🔔" title="لا توجد تذكيرات" description="لم يتم العثور على تذكيرات" />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const customer = r.customer as any
            const user = customer?.user
            const label = getReminderLabel(r.days_remaining!)
            return (
              <Card key={r.id} className={r.is_overdue ? 'border-2 border-red-500' : ''}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {user?.full_name || 'عميل'}
                      </p>
                      <Badge variant={
                        label.color === 'red' ? 'danger' :
                        label.color === 'orange' ? 'warning' :
                        label.color === 'yellow' ? 'warning' : 'success'
                      }>
                        {label.text}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
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
                      {' • '}
                      تذكير قبلها بـ {r.remind_before_days} يوم
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`https://wa.me/${r.phone_number}?text=تذكير بشحن رصيدك`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                      title="واتساب"
                    >
                      <MessageCircle size={16} />
                    </a>
                    <a
                      href={`tel:${r.phone_number}`}
                      className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                      title="اتصال"
                    >
                      <Phone size={16} />
                    </a>
                    <button
                      onClick={() => toggleActive(r.id, true)}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title="إيقاف"
                    >
                      <Bell size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Add */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="إضافة تذكير شحن" size="md">
        <div className="space-y-4">
          <Select
            label="العميل"
            placeholder="اختر العميل"
            options={customers.map(c => ({
              value: c.id,
              label: `${(c.user as any)?.full_name} - ${(c.user as any)?.phone}`,
            }))}
            value={form.customer_id}
            onChange={e => {
              const cust = customers.find(c => c.id === e.target.value)
              setForm(f => ({
                ...f,
                customer_id: e.target.value,
                phone_number: (cust?.user as any)?.phone || '',
              }))
            }}
            required
          />

          <Input
            label="رقم الهاتف للتذكير"
            type="tel"
            placeholder="01xxxxxxxxx"
            value={form.phone_number}
            onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
            hint="يمكن أن يكون رقم مختلف عن رقم العميل"
            required
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
              placeholder="مثال: 30"
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
              إضافة التذكير
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
