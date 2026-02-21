import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Eye, Edit, Trash2, DollarSign, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/fees'
import { formatDate } from '@/utils/dates'
import type { Customer, Branch } from '@/types'

const TIER_LABELS = {
  vip: { label: 'VIP', color: 'purple' as const },
  active: { label: 'نشط', color: 'success' as const },
  normal: { label: 'عادي', color: 'default' as const },
  inactive: { label: 'غير نشط', color: 'danger' as const },
}

export default function CustomersPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    gender: '',
    birth_date: '',
    area: '',
    branch_id: '',
    initial_balance: '0',
    can_request_services: false,
    create_app_account: false,
  })
  const [saving, setSaving] = useState(false)

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('customers')
        .select('*, user:users(*), branch:branches(*)')
        .order('created_at', { ascending: false })
        .limit(200)
      setCustomers(data || [])
    } finally {
      setLoading(false)
    }
  }

  const loadBranches = async () => {
    const { data } = await supabase.from('branches').select('*').eq('is_active', true)
    setBranches(data || [])
  }

  useEffect(() => {
    loadCustomers()
    loadBranches()
  }, [])

  const handleAdd = async () => {
  if (!form.full_name || !form.phone) {
    toast.error('أدخل الاسم ورقم الهاتف')
    return
  }

  setSaving(true)
  try {
    let userId: string | undefined

    if (form.create_app_account) {
      // استخدام رقم الهاتف كبريد مؤقت
      const email = `${form.phone}@sentraal.local`
      
      // كلمة المرور: المخصصة أو تلقائية
      const password = form.custom_password || generateRandomPassword()
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            phone: form.phone,
            full_name: form.full_name,
          }
        }
      })
      
      if (authError) throw authError
      userId = authData.user?.id

      await supabase.from('users').insert({
        id: userId,
        phone: form.phone,
        email: form.email || null,
        full_name: form.full_name,
        gender: form.gender || null,
        birth_date: form.birth_date || null,
        role: 'customer',
        account_status: 'active',
      })

      // عرض كلمة المرور للأدمن
      toast.success(
        `تم إنشاء الحساب! 🎉\n\nكلمة المرور: ${password}\n\nأرسلها للعميل عبر واتساب`,
        { duration: 15000 }
      )
      
      // نسخ كلمة المرور للحافظة تلقائياً
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(password)
        toast.success('تم نسخ كلمة المرور للحافظة! 📋', { duration: 3000 })
      }
    }

    await supabase.from('customers').insert({
      user_id: userId || null,
      branch_id: form.branch_id || null,
      area: form.area || null,
      initial_balance: parseFloat(form.initial_balance),
      balance: parseFloat(form.initial_balance),
      can_request_services: form.can_request_services,
      is_legacy_account: !form.create_app_account,
    })

    toast.success('تم إضافة العميل')
    setShowAdd(false)
    setForm({ /* reset form */ })
    loadCustomers()
  } catch (e: any) {
    toast.error(e.message || 'حدث خطأ')
  } finally {
    setSaving(false)
  }
}
// دالة توليد كلمة مرور
function generateRandomPassword(length = 8) {
  const chars = '0123456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)]
  }
  return password
}

  const filtered = customers.filter(c => {
    const user = c.user as any
    if (filterTier && c.tier !== filterTier) return false
    if (!search) return true
    const q = search.toLowerCase()
    return user?.full_name?.toLowerCase().includes(q) || user?.phone?.includes(q)
  })

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">العملاء</h1>
          <p className="text-sm text-gray-400">{customers.length} عميل</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
          إضافة عميل
        </Button>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="بحث باسم العميل أو الهاتف..."
            icon={<Search size={16} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-48"
          />
          <Select
            options={[
              { value: '', label: 'كل الفئات' },
              { value: 'vip', label: 'VIP' },
              { value: 'active', label: 'نشط' },
              { value: 'normal', label: 'عادي' },
              { value: 'inactive', label: 'غير نشط' },
            ]}
            value={filterTier}
            onChange={e => setFilterTier(e.target.value)}
            className="w-36"
          />
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text="جاري التحميل..." />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon="👥" title="لا يوجد عملاء" description="لم يتم العثور على عملاء" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => {
            const user = c.user as any
            const tier = TIER_LABELS[c.tier]
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-blue-600 font-bold">
                        {user?.full_name?.[0] || '؟'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {user?.full_name || 'عميل مباشر'}
                      </p>
                      <p className="text-xs text-gray-400">{user?.phone || c.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <Badge variant={tier.color}>{tier.label}</Badge>
                </div>

                <div className="space-y-2 text-sm mb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">الرصيد</span>
                    <span className={`font-semibold ${c.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatCurrency(c.balance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">نقاط الولاء</span>
                    <span className="font-medium text-blue-600">{c.loyalty_points} نقطة</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">المعاملات</span>
                    <span className="text-gray-700 dark:text-gray-300">{c.total_transactions_count}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    icon={<Eye size={14} />}
                    onClick={() => navigate(`/admin/customers/${c.id}`)}
                  >
                    عرض
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal إضافة */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="إضافة عميل جديد" size="lg">
        <div className="space-y-4">
          <Input
            label="الاسم الكامل"
            placeholder="أحمد محمد"
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            required
          />
          <Input
            label="رقم الهاتف"
            type="tel"
            placeholder="01xxxxxxxxx"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            required
          />
          <Input
            label="البريد الإلكتروني (اختياري)"
            type="email"
            placeholder="example@email.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
          <Input
  label="كلمة المرور (اختياري)"
  type="text"
  placeholder="اتركه فارغاً لتوليد كلمة مرور تلقائية"
  value={form.custom_password}
  onChange={e => setForm(f => ({ ...f, custom_password: e.target.value }))}
  hint="8 أرقام على الأقل - سيتم عرضها لك بعد الإنشاء"
/>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="الجنس"
              placeholder="اختياري"
              options={[
                { value: 'male', label: 'ذكر' },
                { value: 'female', label: 'أنثى' },
              ]}
              value={form.gender}
              onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
            />
            <Input
              label="تاريخ الميلاد"
              type="date"
              value={form.birth_date}
              onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
            />
          </div>

          <Input
            label="المنطقة"
            placeholder="مثال: المعادي، القاهرة"
            value={form.area}
            onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
          />

          <Select
            label="الفرع"
            placeholder="اختياري"
            options={branches.map(b => ({ value: b.id, label: b.name }))}
            value={form.branch_id}
            onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
          />

          <Input
            label="الرصيد الافتتاحي"
            type="number"
            placeholder="0.00"
            value={form.initial_balance}
            onChange={e => setForm(f => ({ ...f, initial_balance: e.target.value }))}
          />

          <div className="space-y-2">
            <Toggle
              checked={form.can_request_services}
              onChange={v => setForm(f => ({ ...f, can_request_services: v }))}
              label="السماح بطلب خدمات بدون رصيد"
            />
            <Toggle
              checked={form.create_app_account}
              onChange={v => setForm(f => ({ ...f, create_app_account: v }))}
              label="إنشاء حساب للتطبيق مباشرة (سيتم إرسال كلمة مرور مؤقتة)"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>
              إلغاء
            </Button>
            <Button className="flex-1" loading={saving} onClick={handleAdd}>
              إضافة العميل
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
