import { useState, useEffect } from 'react'
import { Plus, Edit, MapPin, Phone, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Toggle } from '@/components/ui/Toggle'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Branch } from '@/types'

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    area: '',
    phone: '',
    whatsapp: '',
    opening_time: '09:00',
    closing_time: '21:00',
    working_days: DAYS,
    banner_message: '',
    banner_color: 'blue',
    is_main: false,
  })
  const [saving, setSaving] = useState(false)

  const loadBranches = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('branches').select('*').order('is_main', { ascending: false })
      setBranches(data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBranches() }, [])

  const handleAdd = async () => {
    if (!form.name || !form.code) {
      toast.error('أدخل الاسم والكود')
      return
    }
    setSaving(true)
    try {
      await supabase.from('branches').insert({
        ...form,
        is_active: true,
      })
      toast.success('تم إضافة الفرع')
      setShowAdd(false)
      setForm({
        name: '', code: '', address: '', city: '', area: '', phone: '', whatsapp: '',
        opening_time: '09:00', closing_time: '21:00', working_days: DAYS,
        banner_message: '', banner_color: 'blue', is_main: false,
      })
      loadBranches()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      working_days: f.working_days.includes(day)
        ? f.working_days.filter(d => d !== day)
        : [...f.working_days, day]
    }))
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">الفروع</h1>
          <p className="text-sm text-gray-400">{branches.length} فرع</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
          إضافة فرع
        </Button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <EmptyState icon="🏪" title="لا توجد فروع" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {branches.map(b => (
            <Card key={b.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 dark:text-white">{b.name}</h3>
                    {b.is_main && <Badge variant="purple">رئيسي</Badge>}
                  </div>
                  <p className="text-xs text-gray-400">{b.code}</p>
                </div>
                <Badge variant={b.is_open ? 'success' : 'danger'}>
                  {b.is_open ? '🟢 مفتوح' : '🔴 مغلق'}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                {b.address && (
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-gray-400 mt-0.5" />
                    <p className="text-gray-600 dark:text-gray-300">{b.address}</p>
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-300">{b.phone}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-300">
                    {b.opening_time} - {b.closing_time}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="إضافة فرع" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="اسم الفرع"
              placeholder="الفرع الرئيسي"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="الكود"
              placeholder="B001"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              required
            />
          </div>
          <Input
            label="العنوان"
            placeholder="123 شارع..."
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="المدينة"
              placeholder="القاهرة"
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
            />
            <Input
              label="المنطقة"
              placeholder="المعادي"
              value={form.area}
              onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="الهاتف"
              type="tel"
              placeholder="01xxxxxxxxx"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label="واتساب"
              type="tel"
              placeholder="01xxxxxxxxx"
              value={form.whatsapp}
              onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="وقت الافتتاح"
              type="time"
              value={form.opening_time}
              onChange={e => setForm(f => ({ ...f, opening_time: e.target.value }))}
            />
            <Input
              label="وقت الإغلاق"
              type="time"
              value={form.closing_time}
              onChange={e => setForm(f => ({ ...f, closing_time: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              أيام العمل
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.working_days.includes(day)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="رسالة الشريط (اختياري)"
            placeholder="عروض اليوم..."
            value={form.banner_message}
            onChange={e => setForm(f => ({ ...f, banner_message: e.target.value }))}
          />
          <Select
            label="لون الشريط"
            options={[
              { value: 'blue', label: 'أزرق' },
              { value: 'green', label: 'أخضر' },
              { value: 'red', label: 'أحمر' },
            ]}
            value={form.banner_color}
            onChange={e => setForm(f => ({ ...f, banner_color: e.target.value }))}
          />
          <Toggle
            checked={form.is_main}
            onChange={v => setForm(f => ({ ...f, is_main: v }))}
            label="فرع رئيسي"
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>
              إلغاء
            </Button>
            <Button className="flex-1" loading={saving} onClick={handleAdd}>
              إضافة الفرع
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
