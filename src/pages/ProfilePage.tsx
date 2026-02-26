import { useState, useEffect, useRef } from 'react'
import { Save, Upload, Camera, Lock, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { uploadImage, deleteImage } from '@/utils/googleDrive'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface Branch {
  id: string
  name: string
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    email: '',
    role: '',
    avatar_url: '',
    default_branch_id: '',
    notification_settings: {
      transactions: true,
      customers: true,
      inventory: true,
    },
  })
  
  const [branches, setBranches] = useState<Branch[]>([])
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
    loadBranches()
  }, [user])

  const loadProfile = async () => {
    if (!user) return
    
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          email: data.email || '',
          role: data.role || '',
          avatar_url: data.avatar_url || '',
          default_branch_id: data.default_branch_id || '',
          notification_settings: data.notification_settings || {
            transactions: true,
            customers: true,
            inventory: true,
          },
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadBranches = async () => {
    try {
      const { data } = await supabase
        .from('branches')
        .select('id, name')
        .order('name')
      
      setBranches(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // معاينة الصورة
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUploadAvatar = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file || !user) return

    setUploading(true)
    try {
      // حذف الصورة القديمة إن وجدت
      if (profile.avatar_url) {
        const { data: oldData } = await supabase
          .from('users')
          .select('avatar_drive_id')
          .eq('id', user.id)
          .single()
        
        if (oldData?.avatar_drive_id) {
          await deleteImage(oldData.avatar_drive_id)
        }
      }

      // رفع الصورة الجديدة
      const fileName = `profile-${user.id}-${Date.now()}.jpg`
      const { url, fileId } = await uploadImage(file, 'profiles', fileName)

      // تحديث قاعدة البيانات
      await supabase
        .from('users')
        .update({ 
          avatar_url: url,
          avatar_drive_id: fileId 
        })
        .eq('id', user.id)

      setProfile(p => ({ ...p, avatar_url: url }))
      setImagePreview(null)
      toast.success('✅ تم تحديث الصورة')
      
      // تحديث المستخدم في الـ store
      refreshUser?.()
    } catch (e: any) {
      toast.error(e.message || '❌ فشل رفع الصورة')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    
    setSaving(true)
    try {
      await supabase
        .from('users')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          default_branch_id: profile.default_branch_id || null,
        })
        .eq('id', user.id)

      toast.success('✅ تم حفظ التغييرات')
      refreshUser?.()
    } catch (e: any) {
      toast.error(e.message || '❌ حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!user) return

    // التحقق من الحقول
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      toast.error('❌ يجب ملء جميع الحقول')
      return
    }

    if (passwordForm.new.length < 8) {
      toast.error('❌ كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }

    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('❌ كلمة المرور الجديدة غير متطابقة')
      return
    }

    try {
      const { data, error } = await supabase.rpc('change_user_password', {
        p_user_id: user.id,
        p_old_password: passwordForm.current,
        p_new_password: passwordForm.new,
      })

      if (error) throw error

      if (data[0]?.success) {
        toast.success('✅ ' + data[0].message)
        setPasswordForm({ current: '', new: '', confirm: '' })
      } else {
        toast.error('❌ ' + data[0]?.message)
      }
    } catch (e: any) {
      toast.error(e.message || '❌ حدث خطأ')
    }
  }

  const handleSaveNotifications = async () => {
    if (!user) return

    try {
      await supabase
        .from('users')
        .update({ notification_settings: profile.notification_settings })
        .eq('id', user.id)

      toast.success('✅ تم حفظ إعدادات الإشعارات')
    } catch (e: any) {
      toast.error(e.message || '❌ حدث خطأ')
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
    <div className="p-4 space-y-6 max-w-3xl mx-auto pb-20">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        👤 الملف الشخصي
      </h1>

      {/* صورة البروفايل */}
      <Card>
        <CardHeader>
          <CardTitle>📸 صورة البروفايل</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              {imagePreview || profile.avatar_url ? (
                <img
                  src={imagePreview || profile.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera size={48} className="text-gray-400" />
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                <LoadingSpinner />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            
            <Button
              variant="outline"
              icon={<Upload size={16} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              اختر صورة
            </Button>

            {imagePreview && (
              <Button
                icon={<Save size={16} />}
                onClick={handleUploadAvatar}
                loading={uploading}
              >
                رفع الصورة
              </Button>
            )}

            <p className="text-xs text-gray-500">
              الحجم الموصى به: 200x200 بكسل | PNG أو JPG | الحد الأقصى: 2 MB
            </p>
          </div>
        </div>
      </Card>

      {/* المعلومات الأساسية */}
      <Card>
        <CardHeader>
          <CardTitle>📝 المعلومات الأساسية</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <Input
            label="الاسم الكامل"
            value={profile.full_name}
            onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
          />

          <Input
            label="رقم الهاتف"
            value={profile.phone}
            onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
          />

          <Input
            label="البريد الإلكتروني"
            value={profile.email}
            disabled
            hint="لا يمكن تعديل البريد الإلكتروني"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الدور
            </label>
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300">
              {profile.role === 'super_admin' ? '👑 مدير عام' : '👤 مدير'}
            </div>
          </div>

          <Button
            icon={<Save size={16} />}
            loading={saving}
            onClick={handleSaveProfile}
          >
            💾 حفظ التغييرات
          </Button>
        </div>
      </Card>

      {/* الفرع الافتراضي */}
      <Card>
        <CardHeader>
          <CardTitle>🏪 الفرع الافتراضي</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              اختر الفرع
            </label>
            <select
              value={profile.default_branch_id}
              onChange={e => setProfile(p => ({ ...p, default_branch_id: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">بدون فرع افتراضي</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              سيُستخدم هذا الفرع افتراضياً في المعاملات الجديدة
            </p>
          </div>

          <Button
            icon={<Save size={16} />}
            loading={saving}
            onClick={handleSaveProfile}
          >
            💾 حفظ الفرع
          </Button>
        </div>
      </Card>

      {/* تغيير كلمة المرور */}
      <Card>
        <CardHeader>
          <CardTitle>🔒 تغيير كلمة المرور</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <Input
            type="password"
            label="كلمة المرور الحالية"
            value={passwordForm.current}
            onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))}
          />

          <Input
            type="password"
            label="كلمة المرور الجديدة"
            value={passwordForm.new}
            onChange={e => setPasswordForm(p => ({ ...p, new: e.target.value }))}
            hint="8 أحرف على الأقل"
          />

          <Input
            type="password"
            label="تأكيد كلمة المرور"
            value={passwordForm.confirm}
            onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
          />

          <Button
            icon={<Lock size={16} />}
            onClick={handleChangePassword}
          >
            🔐 تحديث كلمة المرور
          </Button>
        </div>
      </Card>

      {/* إعدادات الإشعارات */}
      <Card>
        <CardHeader>
          <CardTitle>🔔 إعدادات الإشعارات</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              إشعارات المعاملات الجديدة
            </span>
            <input
              type="checkbox"
              checked={profile.notification_settings.transactions}
              onChange={e => setProfile(p => ({
                ...p,
                notification_settings: {
                  ...p.notification_settings,
                  transactions: e.target.checked
                }
              }))}
              className="w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              إشعارات العملاء الجدد
            </span>
            <input
              type="checkbox"
              checked={profile.notification_settings.customers}
              onChange={e => setProfile(p => ({
                ...p,
                notification_settings: {
                  ...p.notification_settings,
                  customers: e.target.checked
                }
              }))}
              className="w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              تنبيهات المخزون
            </span>
            <input
              type="checkbox"
              checked={profile.notification_settings.inventory}
              onChange={e => setProfile(p => ({
                ...p,
                notification_settings: {
                  ...p.notification_settings,
                  inventory: e.target.checked
                }
              }))}
              className="w-4 h-4"
            />
          </label>

          <Button
            icon={<Bell size={16} />}
            onClick={handleSaveNotifications}
          >
            💾 حفظ الإعدادات
          </Button>
        </div>
      </Card>
    </div>
  )
}
