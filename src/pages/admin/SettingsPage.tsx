import { useState, useEffect } from 'react'
import { Save, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    wallet_default_fee: '1',
    service_fee_base: '5',
    service_fee_per: '500',
    loyalty_points_per: '500',
    loyalty_points_value: '10',
    referral_required_amount: '1000',
    referral_reward_amount: '50',
    vip_threshold: '50000',
    active_threshold: '10000',
    inactive_days: '30',
    app_name: 'سنترال',
    currency: 'ج',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('settings').select('key, value')
      if (data) {
        const obj: any = {}
        data.forEach(({ key, value }) => {
          obj[key] = value
        })
        setSettings(prev => ({ ...prev, ...obj }))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSettings() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({ key, value }))
      for (const { key, value } of updates) {
        await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
      }
      toast.success('تم حفظ الإعدادات')
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner />
    </div>
  )

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">الإعدادات</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={loadSettings}>
            تحديث
          </Button>
          <Button size="sm" icon={<Save size={14} />} loading={saving} onClick={handleSave}>
            حفظ
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>💰 الرسوم والخدمات</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="رسوم المحفظة الافتراضية (ج)"
            type="number"
            value={settings.wallet_default_fee}
            onChange={e => setSettings(s => ({ ...s, wallet_default_fee: e.target.value }))}
          />
          <Input
            label="رسوم الخدمة الأساسية (ج)"
            type="number"
            value={settings.service_fee_base}
            onChange={e => setSettings(s => ({ ...s, service_fee_base: e.target.value }))}
          />
          <Input
            label="رسوم الخدمة لكل (ج)"
            type="number"
            value={settings.service_fee_per}
            onChange={e => setSettings(s => ({ ...s, service_fee_per: e.target.value }))}
            hint="مثال: 5 ج لكل 500 ج"
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🎁 نقاط الولاء</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="نقطة واحدة لكل (ج)"
            type="number"
            value={settings.loyalty_points_per}
            onChange={e => setSettings(s => ({ ...s, loyalty_points_per: e.target.value }))}
          />
          <Input
            label="قيمة النقطة (ج)"
            type="number"
            value={settings.loyalty_points_value}
            onChange={e => setSettings(s => ({ ...s, loyalty_points_value: e.target.value }))}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>👥 الإحالات</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="المبلغ المطلوب لإتمام الإحالة (ج)"
            type="number"
            value={settings.referral_required_amount}
            onChange={e => setSettings(s => ({ ...s, referral_required_amount: e.target.value }))}
          />
          <Input
            label="مكافأة الإحالة (ج)"
            type="number"
            value={settings.referral_reward_amount}
            onChange={e => setSettings(s => ({ ...s, referral_reward_amount: e.target.value }))}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>⭐ شرائح العملاء</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="حد VIP (ج شهرياً)"
            type="number"
            value={settings.vip_threshold}
            onChange={e => setSettings(s => ({ ...s, vip_threshold: e.target.value }))}
          />
          <Input
            label="حد النشط (ج شهرياً)"
            type="number"
            value={settings.active_threshold}
            onChange={e => setSettings(s => ({ ...s, active_threshold: e.target.value }))}
          />
          <Input
            label="أيام عدم النشاط"
            type="number"
            value={settings.inactive_days}
            onChange={e => setSettings(s => ({ ...s, inactive_days: e.target.value }))}
            hint="يصبح العميل غير نشط بعد"
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🏪 معلومات التطبيق</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="اسم التطبيق"
            value={settings.app_name}
            onChange={e => setSettings(s => ({ ...s, app_name: e.target.value }))}
          />
          <Input
            label="رمز العملة"
            value={settings.currency}
            onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
          />
        </div>
      </Card>
    </div>
  )
}
