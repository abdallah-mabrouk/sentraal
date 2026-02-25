import { useState, useEffect, useMemo } from 'react'
import { Save, RefreshCw, Upload, Trash2, AlertTriangle, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { DarkModeToggle } from '@/components/ui/DarkModeToggle'

interface Tier {
  id: string
  name: string
  icon: string
  monthly_threshold: number
  transfer_discount: number
  withdrawal_discount: number
  is_active: boolean
}

export default function SettingsPage() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  
  const [settings, setSettings] = useState({
    // المظهر
    app_name: 'سنترال',
    app_logo_url: '',
    app_favicon_url: '',
    app_primary_color: '#3B82F6',
    // الرسوم
    wallet_default_fee: '1',
    service_fee_base: '5',
    service_fee_per: '500',
    service_fee_tolerance: '50',
    // النقاط
    loyalty_enabled: 'true',
    loyalty_points_per: '500',
    loyalty_points_value: '10',
    // الإحالات
    referral_enabled: 'true',
    referral_required_amount: '1000',
    referral_reward_amount: '50',
    // عام
    currency: 'ج',
  })
  
  const [tiers, setTiers] = useState<Tier[]>([])
  const [systemInfo, setSystemInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Modals
  const [showTierModal, setShowTierModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [editingTier, setEditingTier] = useState<Tier | null>(null)
  const [resetConfirmation, setResetConfirmation] = useState('')
  
  // Tier form
  const [tierForm, setTierForm] = useState({
    name: '',
    icon: '⭐',
    monthly_threshold: '',
    transfer_discount: '',
    withdrawal_discount: '',
  })

  // Load data
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
        .from('pricing_tiers_v2')
        .select('*')
        .order('monthly_threshold', { ascending: true })
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

  // Save settings
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

  // Tier management
  const handleAddTier = () => {
    setEditingTier(null)
    setTierForm({
      name: '',
      icon: '⭐',
      monthly_threshold: '',
      transfer_discount: '',
      withdrawal_discount: '',
    })
    setShowTierModal(true)
  }

  const handleEditTier = (tier: Tier) => {
    setEditingTier(tier)
    setTierForm({
      name: tier.name,
      icon: tier.icon,
      monthly_threshold: tier.monthly_threshold.toString(),
      transfer_discount: tier.transfer_discount.toString(),
      withdrawal_discount: tier.withdrawal_discount.toString(),
    })
    setShowTierModal(true)
  }

  const handleSaveTier = async () => {
    try {
      const data = {
        name: tierForm.name,
        icon: tierForm.icon,
        monthly_threshold: parseFloat(tierForm.monthly_threshold),
        transfer_discount: parseFloat(tierForm.transfer_discount),
        withdrawal_discount: parseFloat(tierForm.withdrawal_discount),
        is_active: true,
      }

      if (editingTier) {
        await supabase.from('pricing_tiers_v2').update(data).eq('id', editingTier.id)
        toast.success('✅ تم تحديث الشريحة')
      } else {
        await supabase.from('pricing_tiers_v2').insert(data)
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
      await supabase.from('pricing_tiers_v2').delete().eq('id', id)
      toast.success('✅ تم حذف الشريحة')
      loadTiers()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    }
  }

  const handleToggleTier = async (tier: Tier) => {
    try {
      await supabase
        .from('pricing_tiers_v2')
        .update({ is_active: !tier.is_active })
        .eq('id', tier.id)
      loadTiers()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    }
  }

  // Reset database
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
      
      // Reload page after 2 seconds
      setTimeout(() => window.location.reload(), 2000)
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    }
  }

  // Export backup
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

  // Calculate example fees
  const exampleFees = useMemo(() => {
    const base = parseFloat(settings.service_fee_base) || 5
    const per = parseFloat(settings.service_fee_per) || 500
    const tolerance = parseFloat(settings.service_fee_tolerance) || 50

    const calc = (amount: number) => {
      if (amount <= per) return base
      const extra = amount - per + tolerance
      const slots = Math.floor(extra / per)
      return base + slots * base
    }

    return [
      { amount: 500, fee: calc(500) },
      { amount: 550, fee: calc(550) },
      { amount: 1000, fee: calc(1000) },
      { amount: 1050, fee: calc(1050) },
    ]
  }, [settings.service_fee_base, settings.service_fee_per, settings.service_fee_tolerance])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-gray-50 dark:bg-gray-900 z-10 py-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">⚙️ الإعدادات</h1>
        <div className="flex gap-2 items-center">
          <DarkModeToggle />
          <Button variant="ghost" size="sm" icon={<RefreshCw size={16} />} onClick={loadAll}>
            تحديث
          </Button>
          <Button size="sm" icon={<Save size={16} />} loading={saving} onClick={handleSave}>
            حفظ
          </Button>
        </div>
      </div>

      {/* 1. المظهر العام */}
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                اللوجو الرئيسي
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الأيقونة (Favicon)
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

      {/* Continue in next message due to length... */}
    </div>
  )
}
      {/* 2. إدارة الشرائح */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>⭐ إدارة الشرائح</CardTitle>
            <Button size="sm" onClick={handleAddTier}>+ إضافة شريحة</Button>
          </div>
        </CardHeader>
        <div className="space-y-3">
          {tiers.map(tier => (
            <div
              key={tier.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{tier.icon}</span>
                <div>
                  <div className="font-bold text-gray-800 dark:text-white">{tier.name}</div>
                  <div className="text-sm text-gray-500">
                    الحد: {tier.monthly_threshold.toLocaleString()} ج/شهر
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  تحويل: {tier.transfer_discount}% | سحب: {tier.withdrawal_discount}%
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditTier(tier)}
                  >
                    ✏️
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTier(tier.id)}
                  >
                    🗑️
                  </Button>
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
        </div>
      </Card>

      {/* 3. الرسوم والخدمات */}
      <Card>
        <CardHeader>
          <CardTitle>💰 الرسوم والخدمات</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="رسوم الخدمة الأساسية (ج)"
              type="number"
              value={settings.service_fee_base}
              onChange={e => setSettings(s => ({ ...s, service_fee_base: e.target.value }))}
            />
            <Input
              label="رسوم لكل (ج)"
              type="number"
              value={settings.service_fee_per}
              onChange={e => setSettings(s => ({ ...s, service_fee_per: e.target.value }))}
            />
            <Input
              label="هامش التسامح (ج)"
              type="number"
              value={settings.service_fee_tolerance}
              onChange={e => setSettings(s => ({ ...s, service_fee_tolerance: e.target.value }))}
              hint="الزيادة المسموحة دون رسوم إضافية"
            />
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
              ℹ️ أمثلة الحساب:
            </div>
            <div className="space-y-1 text-sm text-blue-700 dark:text-blue-400">
              {exampleFees.map(({ amount, fee }) => (
                <div key={amount}>
                  • {amount.toLocaleString()} ج → {fee} ج
                </div>
              ))}
            </div>
          </div>

          <Input
            label="رسوم المحفظة الافتراضية (ج)"
            type="number"
            value={settings.wallet_default_fee}
            onChange={e => setSettings(s => ({ ...s, wallet_default_fee: e.target.value }))}
          />
        </div>
      </Card>

      {/* 4. نقاط الولاء */}
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

      {/* 5. الإحالات */}
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

      {/* 6. إعدادات عامة */}
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

      {/* 7. النسخ الاحتياطي */}
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

      {/* 8. منطقة الخطر (Super Admin فقط) */}
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
                ⚠️ تحذير: سيتم حذف جميع البيانات بشكل نهائي (المعاملات، العملاء، المخزون، إلخ)
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                هذه الميزة مخصصة للتجربة فقط. لا يمكن التراجع عن هذا الإجراء!
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

      {/* 9. معلومات النظام */}
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

      {/* Tier Modal */}
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
          
          <Input
            label="الحد الشهري (ج)"
            type="number"
            value={tierForm.monthly_threshold}
            onChange={e => setTierForm(f => ({ ...f, monthly_threshold: e.target.value }))}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="خصم التحويل (%)"
              type="number"
              value={tierForm.transfer_discount}
              onChange={e => setTierForm(f => ({ ...f, transfer_discount: e.target.value }))}
            />
            <Input
              label="خصم السحب (%)"
              type="number"
              value={tierForm.withdrawal_discount}
              onChange={e => setTierForm(f => ({ ...f, withdrawal_discount: e.target.value }))}
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

      {/* Reset Modal */}
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
              سيتم حذف جميع:
            </p>
            <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside">
              <li>المعاملات</li>
              <li>العملاء (ما عدا حسابك)</li>
              <li>المنتجات والفئات</li>
              <li>الماكينات والمحافظ</li>
              <li>كل البيانات الأخرى</li>
            </ul>
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
