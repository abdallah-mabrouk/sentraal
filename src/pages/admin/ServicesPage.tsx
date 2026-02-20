import { useState, useEffect } from 'react'
import { Plus, Edit, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Toggle } from '@/components/ui/Toggle'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Service } from '@/types'

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: '⚡',
  })
  const [saving, setSaving] = useState(false)

  const loadServices = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('services').select('*').order('display_order')
      setServices(data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadServices() }, [])

  const handleAdd = async () => {
    if (!form.name) {
      toast.error('أدخل اسم الخدمة')
      return
    }
    setSaving(true)
    try {
      await supabase.from('services').insert({
        name: form.name,
        description: form.description || null,
        icon: form.icon,
        display_order: services.length,
        is_active: true,
      })
      toast.success('تم إضافة الخدمة')
      setShowAdd(false)
      setForm({ name: '', description: '', icon: '⚡' })
      loadServices()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('services').update({ is_active: !current }).eq('id', id)
    loadServices()
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">الخدمات المتاحة</h1>
          <p className="text-sm text-gray-400">{services.length} خدمة</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
          إضافة خدمة
        </Button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text="جاري التحميل..." />
        </div>
      ) : services.length === 0 ? (
        <Card>
          <EmptyState icon="🛠️" title="لا توجد خدمات" />
        </Card>
      ) : (
        <div className="space-y-2">
          {services.map(s => (
            <Card key={s.id}>
              <div className="flex items-center gap-3">
                <GripVertical size={18} className="text-gray-400 cursor-move" />
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-2xl">
                  {s.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 dark:text-white">{s.name}</h3>
                  {s.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{s.description}</p>
                  )}
                </div>
                <Badge variant={s.is_active ? 'success' : 'danger'}>
                  {s.is_active ? 'نشط' : 'موقوف'}
                </Badge>
                <div className="flex gap-2">
                  <Button
                    variant={s.is_active ? 'danger' : 'primary'}
                    size="sm"
                    onClick={() => toggleActive(s.id, s.is_active)}
                  >
                    {s.is_active ? 'إيقاف' : 'تفعيل'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="إضافة خدمة" size="sm">
        <div className="space-y-4">
          <Input
            label="اسم الخدمة"
            placeholder="مثال: تحويل فودافون كاش"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="الوصف (اختياري)"
            placeholder="وصف مختصر..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <Input
            label="الأيقونة (emoji)"
            placeholder="⚡"
            value={form.icon}
            onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
            hint="استخدم emoji من لوحة المفاتيح"
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>
              إلغاء
            </Button>
            <Button className="flex-1" loading={saving} onClick={handleAdd}>
              إضافة الخدمة
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
