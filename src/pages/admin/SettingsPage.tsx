import { useState, useEffect } from 'react'
import { Save, RefreshCw, Trash2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'

interface ProgressiveTier {
  id: string
  tier_order: number
  name: string
  icon: string
  threshold_from: number
  threshold_to: number
  transfer_price_per_thousand: number
  withdrawal_price_per_thousand: number
  is_active: boolean
}

export default function SettingsPage() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  
  const [settings, setSettings] = useState({
    app_name: 'سنترال',
    app_logo_url: '',
    app_favicon_url: '',
    loyalty_enabled: 'true',
    loyalty_points_per: '500',
    loyalty_points_value: '10',
    referral_enabled: 'true',
    referral_required_amount: '1000',
    referral_reward_amount: '50',
    currency: 'ج',
  })
  
  const [tiers, setTiers] = useState<ProgressiveTier[]>([])
  const [systemInfo, setSystemInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [showTierModal, setShowTierModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [editingTier, setEditingTier] = useState<ProgressiveTier | null>(null)
  const [resetConfirmation, setResetConfirmation] = useState('')
  
  const [tierForm, setTierForm] = useState({
    name: '',
    icon: '⭐',
    threshold_from: '',
    threshold_to: '',
    transfer_price_per_thousand: '',
    withdrawal_price_per_thousand: '',
  })

  const loadSettings = async () => {
    try {
      const { data } = await supabase.from('settings').select('key, value')
      if (data) {
        const obj: any = {}
        data.forEach(({ key, value }) => { obj[key] = value })
        setSettings(prev => ({ ...prev, ...obj }))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const loadTiers = async () => {
    try {
      const { data } = await supabase
        .from('pricing_tiers_progressive')
        .select('*')
        .order('tier_order', { ascending: true })
      setTiers(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadSystemInfo = async () => {
    try {
      const { data } = await supabase.from('view_system_info').select('*').single()
      setSystemInfo(data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadSettings(), loadTiers(), loadSystemInfo()])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({ key, value }))
      for (const { key, value } of updates) {
        await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
      }
      toast.success('✅ تم حفظ الإعدادات')
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleAddTier = () => {
    setEditingTier(null)
    const lastTier = tiers[tiers.length - 1]
    setTierForm({
      name: '',
      icon: '⭐',
      threshold_from: lastTier ? lastTier.threshold_to.toString() : '0',
      threshold_to: '',
      transfer_price_per_thousand: '',
      withdrawal_price_per_thousand: '',
    })
    setShowTierModal(true)
  }

  const handleEditTier = (tier: ProgressiveTier) => {
    setEditingTier(tier)
    setTierForm({
      name: tier.name,
      icon: tier.icon,
      threshold_from: tier.threshold_from?.toString() || "",
      threshold_to: tier.threshold_to?.toString() || "",
      transfer_price_per_thousand: tier.transfer_price_per_thousand?.toString() || "",
      withdrawal_price_per_thousand: tier.withdrawal_price_per_thousand?.toString() || "",
    })
    setShowTierModal(true)
  }

  const handleSaveTier = async () => {
    try {
      const data = {
        name: tierForm.name,
        icon: tierForm.icon,
        threshold_from: parseFloat(tierForm.threshold_from),
        threshold_to: parseFloat(tierForm.threshold_to),
        transfer_price_per_thousand: parseFloat(tierForm.transfer_price_per_thousand),
        withdrawal_price_per_thousand: parseFloat(tierForm.withdrawal_price_per_thousand),
        is_active: true,
      }

      if (editingTier) {
        await supabase
          .from('pricing_tiers_progressive')
          .update(data)
          .eq('id', editingTier.id)
        toast.success('✅ تم تحديث الشريحة')
      } else {
        const maxOrder = Math.max(...tiers.map(t => t.tier_order), 0)
        await supabase
          .from('pricing_tiers_progressive')
          .insert({ ...data, tier_order: maxOrder + 1 })
        toast.success('✅ تم إضافة الشريحة')
      }

      setShowTierModal(false)
      loadTiers()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    }
  }

  const handleDeleteTier = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الشريحة؟')) return
    try {
      await supabase.from('pricing_tiers_progressive').delete().eq('id', id)
      toast.success('✅ تم حذف الشريحة')
      loadTiers()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    }
  }

  const handleToggleTier = async (tier: ProgressiveTier) => {
    try {
      await supabase
        .from('pricing_tiers_progressive')
        .update({ is_active: !tier.is_active })
        .eq('id', tier.id)
      loadTiers()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    }
  }

  const handleResetDatabase = async () => {
    if (resetConfirmation !== 'RESET') {
      toast.error('❌ يجب كتابة RESET للتأكيد')
      return
    }

    try {
      const { error } = await supabase.rpc('reset_all_data', {
        p_admin_id: user?.id,
        p_confirmation: resetConfirmation,
      })

      if (error) throw error

      toast.success('✅ تم مسح جميع البيانات')
      setShowResetModal(false)
      setResetConfirmation('')
      
      setTimeout(() => window.location.reload(), 2000)
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    }
  }

  const handleExportBackup = async () => {
    try {
      const { data, error } = await supabase.rpc('export_backup_info')
      if (error) throw error

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      
      toast.success('✅ تم تصدير النسخة الاحتياطية')
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between sticky top-0 bg-gray-50 dark:bg-gray-900 z-10 py-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">⚙️ الإعدادات</h1>
        <div className="flex gap-2 items-center">
          <Button variant="ghost" size="sm" icon={<RefreshCw size={16} />} onClick={loadAll}>
            تحديث
          </Button>
          <Button size="sm" icon={<Save size={16} />} loading={saving} onClick={handleSave}>
            حفظ
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🎨 المظهر العام</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <Input
            label="اسم التطبيق"
            value={settings.app_name}
            onChange={e => setSettings(s => ({ ...s, app_name: e.target.value }))}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                اللوجو الرئيسي
                {settings.app_logo_url && (
                  <div className="relative group">
                    <span className="cursor-help text-blue-500">ℹ️</span>
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-10">
                      <div>الحجم الموصى به: 200x60 بكسل</div>
                      <div>الصيغة: PNG أو SVG</div>
                      <div>الحجم الأقصى: 500 KB</div>
                    </div>
                  </div>
                )}
              </label>
              <div className="flex items-center gap-2">
                {settings.app_logo_url && (
                  <img 
                    src={settings.app_logo_url} 
                    alt="Logo" 
                    className="w-16 h-16 object-contain rounded border"
                  />
                )}
                <Input
                  placeholder="رابط اللوجو"
                  value={settings.app_logo_url}
                  onChange={e => setSettings(s => ({ ...s, app_logo_url: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الأيقونة (Favicon)
                <div className="relative group">
                  <span className="cursor-help text-blue-500">ℹ️</span>
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-10">
                    <div>الحجم الموصى به: 32x32 بكسل</div>
                    <div>الصيغة: ICO أو PNG</div>
                    <div>الحجم الأقصى: 100 KB</div>
                  </div>
                </div>
              </label>
              <div className="flex items-center gap-2">
                {settings.app_favicon_url && (
                  <img 
                    src={settings.app_favicon_url} 
                    alt="Favicon" 
                    className="w-8 h-8 object-contain rounded border"
                  />
                )}
                <Input
                  placeholder="رابط الأيقونة"
                  value={settings.app_favicon_url}
                  onChange={e => setSettings(s => ({ ...s, app_favicon_url: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>📊 نظام الشرائح المتدرجة</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                السعر لكل ألف جنيه يقل مع زيادة معاملات الكاش الشهرية
              </p>
            </div>
            <Button size="sm" onClick={handleAddTier}>+ إضافة شريحة</Button>
          </div>
        </CardHeader>
        <div className="space-y-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-3xl">{tier.icon}</span>
                <div className="flex-1">
                  <div className="font-bold text-gray-800 dark:text-white">{tier.name}</div>
                  <div className="text-sm text-gray-500">
                    من {tier.threshold_from.toLocaleString()} إلى {tier.threshold_to.toLocaleString()} ج
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    💸 تحويل: {tier.transfer_price_per_thousand} ج/ألف
                  </div>
                  <div className="text-sm font-bold text-green-600 dark:text-green-400">
                    💰 سحب: {tier.withdrawal_price_per_thousand} ج/ألف
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditTier(tier)}
                  >
                    ✏️
                  </Button>
                  {tiers.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteTier(tier.id)}
                    >
                      🗑️
                    </Button>
                  )}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tier.is_active}
                      onChange={() => handleToggleTier(tier)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          ))}
          
          {tiers.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                💡 كيف يعمل النظام:
              </div>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• المعاملة تُقسم على الشرائح المتبقية تلقائياً</li>
                <li>• كلما زادت معاملاتك، قل السعر</li>
                <li>• يُحسب على معاملات الكاش فقط للشهر الحالي</li>
                <li>• سعر التحويل يختلف عن سعر السحب</li>
              </ul>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🎁 نقاط الولاء</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.loyalty_enabled === 'true'}
              onChange={e => setSettings(s => ({ ...s, loyalty_enabled: e.target.checked ? 'true' : 'false' }))}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              ✓ تفعيل نظام نقاط الولاء
            </span>
          </label>

          {settings.loyalty_enabled === 'true' && (
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
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>👥 نظام الإحالات</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.referral_enabled === 'true'}
              onChange={e => setSettings(s => ({ ...s, referral_enabled: e.target.checked ? 'true' : 'false' }))}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              ✓ تفعيل نظام الإحالات
            </span>
          </label>

          {settings.referral_enabled === 'true' && (
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
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🌍 إعدادات عامة</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="رمز العملة"
            value={settings.currency}
            onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🔒 النسخ الاحتياطي</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <Button
            variant="outline"
            icon={<Download size={16} />}
            onClick={handleExportBackup}
          >
            📥 تصدير نسخة احتياطية
          </Button>
          <p className="text-sm text-gray-500">
            سيتم تنزيل ملف JSON يحتوي على إحصائيات النظام والإعدادات
          </p>
        </div>
      </Card>

      {isSuperAdmin && (
        <Card className="border-2 border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">
              ⚠️ منطقة الخطر
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300 mb-2">
                ⚠️ تحذير: سيتم حذف جميع البيانات بشكل نهائي
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                لا يمكن التراجع عن هذا الإجراء!
              </p>
            </div>
            
            <Button
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50"
              icon={<Trash2 size={16} />}
              onClick={() => setShowResetModal(true)}
            >
              🗑️ مسح كل البيانات
            </Button>
          </div>
        </Card>
      )}

      {systemInfo && (
        <Card>
          <CardHeader>
            <CardTitle>ℹ️ معلومات النظام</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">المعاملات</div>
              <div className="text-xl font-bold">{systemInfo.transactions_count}</div>
            </div>
            <div>
              <div className="text-gray-500">العملاء</div>
              <div className="text-xl font-bold">{systemInfo.customers_count}</div>
            </div>
            <div>
              <div className="text-gray-500">المنتجات</div>
              <div className="text-xl font-bold">{systemInfo.products_count}</div>
            </div>
            <div>
              <div className="text-gray-500">الفروع</div>
              <div className="text-xl font-bold">{systemInfo.branches_count}</div>
            </div>
          </div>
        </Card>
      )}

      <Modal
        isOpen={showTierModal}
        onClose={() => setShowTierModal(false)}
        title={editingTier ? '✏️ تعديل شريحة' : '➕ إضافة شريحة جديدة'}
      >
        <div className="space-y-4">
          <Input
            label="اسم الشريحة"
            value={tierForm.name}
            onChange={e => setTierForm(f => ({ ...f, name: e.target.value }))}
            placeholder="مثال: VIP، ذهبي، فضي"
          />
          
          <Input
            label="الأيقونة (Emoji)"
            value={tierForm.icon}
            onChange={e => setTierForm(f => ({ ...f, icon: e.target.value }))}
            placeholder="💎"
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="من (ج)"
              type="number"
              value={tierForm.threshold_from}
              onChange={e => setTierForm(f => ({ ...f, threshold_from: e.target.value }))}
            />
            <Input
              label="إلى (ج)"
              type="number"
              value={tierForm.threshold_to}
              onChange={e => setTierForm(f => ({ ...f, threshold_to: e.target.value }))}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="💸 سعر التحويل (ج/ألف)"
              type="number"
              value={tierForm.transfer_price_per_thousand}
              onChange={e => setTierForm(f => ({ ...f, transfer_price_per_thousand: e.target.value }))}
              hint="مثال: 10 = كل 1000 ج تحويل بـ 10 ج"
            />
            <Input
              label="💰 سعر السحب (ج/ألف)"
              type="number"
              value={tierForm.withdrawal_price_per_thousand}
              onChange={e => setTierForm(f => ({ ...f, withdrawal_price_per_thousand: e.target.value }))}
              hint="مثال: 8 = كل 1000 ج سحب بـ 8 ج"
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowTierModal(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveTier}>
              {editingTier ? 'تحديث' : 'إضافة'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showResetModal}
        onClose={() => {
          setShowResetModal(false)
          setResetConfirmation('')
        }}
        title="⚠️ تأكيد مسح البيانات"
      >
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg space-y-2">
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">
              ⚠️ تحذير شديد: هذا الإجراء لا يمكن التراجع عنه!
            </p>
            <p className="text-sm text-red-700 dark:text-red-400">
              سيتم حذف جميع المعاملات والعملاء والمنتجات
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              للتأكيد، اكتب: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">RESET</code>
            </label>
            <Input
              value={resetConfirmation}
              onChange={e => setResetConfirmation(e.target.value)}
              placeholder="اكتب RESET هنا"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowResetModal(false)
                setResetConfirmation('')
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50"
              onClick={handleResetDatabase}
              disabled={resetConfirmation !== 'RESET'}
            >
              🔥 مسح نهائياً
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
