import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useSettings } from '@/hooks/useSettings'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatCurrency, calculateBaseFees } from '@/utils/fees'
import type { Service } from '@/types'

export default function RequestPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { customer } = useAuthStore()
  const { settings } = useSettings()
  const [services, setServices] = useState<Service[]>([])
  const [form, setForm] = useState({
    service_id: '',
    request_type: 'transfer' as 'transfer' | 'withdrawal',
    amount: '',
    target_phone: '',
    notes: '',
  })
  const [estimatedFees, setEstimatedFees] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('services').select('*').eq('is_active', true)
      .then(({ data }) => setServices(data || []))
    
    // إذا جاء من صفحة الخدمات
    const state = location.state as any
    if (state?.service) {
      setForm(f => ({ ...f, service_id: state.service.id }))
    }
  }, [])

  useEffect(() => {
    if (form.amount && !isNaN(Number(form.amount))) {
      const amount = parseFloat(form.amount)
      const base = calculateBaseFees(amount, settings?.service_fee_base ?? 5, settings?.service_fee_per ?? 500)
      const walletFee = settings?.wallet_default_fee ?? 1
      setEstimatedFees(base + walletFee)
    } else {
      setEstimatedFees(0)
    }
  }, [form.amount, settings])

  const handleSubmit = async () => {
    if (!form.amount || !form.request_type) {
      toast.error('أدخل البيانات المطلوبة')
      return
    }
    if (form.request_type === 'transfer' && !form.target_phone) {
      toast.error('أدخل رقم الهاتف للتحويل')
      return
    }

    setSaving(true)
    try {
      await supabase.from('service_requests').insert({
        customer_id: customer?.id,
        request_type: form.request_type,
        amount: parseFloat(form.amount),
        target_phone: form.target_phone || null,
        estimated_fees: estimatedFees,
        notes: form.notes || null,
      })
      toast.success('تم إرسال الطلب بنجاح! سيتم مراجعته قريباً')
      navigate('/app')
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  if (!customer) return null

  const total = parseFloat(form.amount || '0') + estimatedFees
  const hasSufficient = customer.can_request_services || customer.balance >= total

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/app')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowRight size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">طلب خدمة</h1>
          <p className="text-sm text-gray-400">املأ البيانات وسنقوم بتنفيذ طلبك</p>
        </div>
      </div>

      {/* Balance */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-600 mb-0.5">رصيدك الحالي</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(customer.balance)}</p>
          </div>
          {customer.can_request_services && (
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-lg">
              ✓ يمكنك الطلب بدون رصيد
            </span>
          )}
        </div>
      </Card>

      {/* Form */}
      <Card>
        <div className="space-y-4">
          {services.length > 0 && (
            <Select
              label="الخدمة (اختياري)"
              placeholder="اختر الخدمة"
              options={services.map(s => ({ value: s.id, label: `${s.icon || ''} ${s.name}` }))}
              value={form.service_id}
              onChange={e => setForm(f => ({ ...f, service_id: e.target.value }))}
            />
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              نوع العملية
            </label>
            <div className="flex gap-2">
              {(['transfer', 'withdrawal'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setForm(f => ({ ...f, request_type: type }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.request_type === type
                      ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 text-gray-500'
                  }`}
                >
                  {type === 'transfer' ? '💸 تحويل' : '💵 سحب'}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="المبلغ"
            type="number"
            placeholder="0.00"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            required
          />

          {form.request_type === 'transfer' && (
            <Input
              label="رقم الهاتف المستهدف"
              type="tel"
              placeholder="01xxxxxxxxx"
              value={form.target_phone}
              onChange={e => setForm(f => ({ ...f, target_phone: e.target.value }))}
              required
            />
          )}

          <Input
            label="ملاحظات (اختياري)"
            placeholder="أي تفاصيل إضافية..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>
      </Card>

      {/* Summary */}
      {form.amount && (
        <Card className="bg-gray-50 dark:bg-gray-700">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">المبلغ</span>
              <span className="font-medium">{formatCurrency(parseFloat(form.amount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">الرسوم المتوقعة</span>
              <span className="font-medium">{formatCurrency(estimatedFees)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="font-semibold text-gray-700 dark:text-gray-200">المطلوب</span>
              <span className="font-bold text-blue-600 text-lg">{formatCurrency(total)}</span>
            </div>
            {!hasSufficient && (
              <p className="text-xs text-red-500 pt-2">
                ⚠️ رصيدك غير كافٍ. تواصل مع المحل لشحن رصيدك أو السماح لك بالطلب بدون رصيد.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Submit */}
      <Button
        className="w-full"
        size="lg"
        icon={<Send size={18} />}
        loading={saving}
        onClick={handleSubmit}
        disabled={!hasSufficient && !customer.can_request_services}
      >
        إرسال الطلب
      </Button>

      {!hasSufficient && (
        <p className="text-xs text-center text-gray-400">
          الطلب سيصل للمحل فوراً وسيتم تنفيذه بعد المراجعة
        </p>
      )}
    </div>
  )
}
