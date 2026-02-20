import { useState, useEffect } from 'react'
import { Plus, Calendar } from 'lucide-react'
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
import { formatDate } from '@/utils/dates'
import type { Offer } from '@/types'

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    target_gender: 'all',
    is_birthday_offer: false,
    applies_to: 'all' as 'products' | 'services' | 'all',
  })
  const [saving, setSaving] = useState(false)

  const loadOffers = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('offers').select('*').order('created_at', { ascending: false })
      setOffers(data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOffers() }, [])

  const handleAdd = async () => {
    if (!form.title || !form.discount_value) {
      toast.error('أدخل العنوان والخصم')
      return
    }
    setSaving(true)
    try {
      await supabase.from('offers').insert({
        title: form.title,
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        start_date: form.start_date,
        end_date: form.end_date,
        target_gender: form.target_gender,
        is_birthday_offer: form.is_birthday_offer,
        applies_to: form.applies_to,
        is_active: true,
      })
      toast.success('تم إضافة العرض')
      setShowAdd(false)
      setForm({
        title: '', description: '', discount_type: 'percentage', discount_value: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        target_gender: 'all', is_birthday_offer: false, applies_to: 'all',
      })
      loadOffers()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('offers').update({ is_active: !current }).eq('id', id)
    loadOffers()
  }

  const isActive = (offer: Offer) => {
    const now = new Date()
    const start = new Date(offer.start_date)
    const end = new Date(offer.end_date)
    return offer.is_active && now >= start && now <= end
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">العروض والخصومات</h1>
          <p className="text-sm text-gray-400">{offers.length} عرض</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
          إضافة عرض
        </Button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text="جاري التحميل..." />
        </div>
      ) : offers.length === 0 ? (
        <Card>
          <EmptyState icon="🎁" title="لا توجد عروض" />
        </Card>
      ) : (
        <div className="space-y-3">
          {offers.map(o => (
            <Card key={o.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-2xl">
                    🎁
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{o.title}</h3>
                    {o.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{o.description}</p>
                    )}
                  </div>
                </div>
                <Badge variant={isActive(o) ? 'success' : 'default'}>
                  {isActive(o) ? 'نشط' : 'غير نشط'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-400 mb-0.5">الخصم</p>
                  <p className="font-semibold text-purple-600">
                    {o.discount_type === 'percentage' ? `${o.discount_value}%` : `${o.discount_value} ج`}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 mb-0.5">من</p>
                  <p className="text-gray-700 dark:text-gray-300">{formatDate(o.start_date, 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-0.5">إلى</p>
                  <p className="text-gray-700 dark:text-gray-300">{formatDate(o.end_date, 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-0.5">يشمل</p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {o.applies_to === 'all' ? 'الكل' : o.applies_to === 'products' ? 'المنتجات' : 'الخدمات'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <Button
                  variant={o.is_active ? 'danger' : 'primary'}
                  size="sm"
                  onClick={() => toggleActive(o.id, o.is_active)}
                >
                  {o.is_active ? 'إيقاف' : 'تفعيل'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="إضافة عرض" size="md">
        <div className="space-y-4">
          <Input
            label="عنوان العرض"
            placeholder="مثال: خصم 20% على كل الأكسسوارات"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
          <Input
            label="الوصف (اختياري)"
            placeholder="تفاصيل العرض..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="نوع الخصم"
              options={[
                { value: 'percentage', label: 'نسبة مئوية (%)' },
                { value: 'fixed', label: 'مبلغ ثابت (ج)' },
              ]}
              value={form.discount_type}
              onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as any }))}
            />
            <Input
              label="قيمة الخصم"
              type="number"
              placeholder="20"
              value={form.discount_value}
              onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="من تاريخ"
              type="date"
              value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              icon={<Calendar size={16} />}
            />
            <Input
              label="إلى تاريخ"
              type="date"
              value={form.end_date}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              icon={<Calendar size={16} />}
            />
          </div>
          <Select
            label="الجنس المستهدف"
            options={[
              { value: 'all', label: 'الكل' },
              { value: 'male', label: 'ذكور' },
              { value: 'female', label: 'إناث' },
            ]}
            value={form.target_gender}
            onChange={e => setForm(f => ({ ...f, target_gender: e.target.value }))}
          />
          <Select
            label="ينطبق على"
            options={[
              { value: 'all', label: 'الكل (منتجات وخدمات)' },
              { value: 'products', label: 'المنتجات فقط' },
              { value: 'services', label: 'الخدمات فقط' },
            ]}
            value={form.applies_to}
            onChange={e => setForm(f => ({ ...f, applies_to: e.target.value as any }))}
          />
          <Toggle
            checked={form.is_birthday_offer}
            onChange={v => setForm(f => ({ ...f, is_birthday_offer: v }))}
            label="عرض عيد ميلاد (يظهر تلقائياً للعملاء في يوم ميلادهم)"
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>
              إلغاء
            </Button>
            <Button className="flex-1" loading={saving} onClick={handleAdd}>
              إضافة العرض
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
