import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, Download, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useBranchStore } from '@/stores/branchStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { LoadingSpinner, EmptyState } from '@/components/ui/LoadingSpinner'
import { formatCurrency, calculateFees } from '@/utils/fees'
import { formatDate, formatDateTime } from '@/utils/dates'
import type { Transaction, Customer, Machine, Wallet, PricingTier } from '@/types'

const OP_LABELS: Record<string, { label: string; color: 'info' | 'warning' | 'success' }> = {
  transfer: { label: 'تحويل', color: 'info' },
  withdrawal: { label: 'سحب', color: 'warning' },
  recharge: { label: 'شحن', color: 'success' },
}

export default function TransactionsPage() {
  const { user } = useAuthStore()
  const { getSelectedBranch } = useBranchStore()
  const { settings } = useSettingsStore()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOp, setFilterOp] = useState('')
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])

  // بيانات نموذج الإضافة
  const [customers, setCustomers] = useState<Customer[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [tiers, setTiers] = useState<PricingTier[]>([])

  // حقول النموذج
  const [form, setForm] = useState({
    customer_id: '',
    account_type: 'cash' as 'machine' | 'cash',
    account_id: '',
    operation_type: 'transfer' as 'transfer' | 'withdrawal' | 'recharge',
    amount: '',
    wallet_fees: String(settings?.wallet_default_fee ?? 1),
    notes: '',
  })
  const [fees, setFees] = useState<ReturnType<typeof calculateFees> | null>(null)
  const [saving, setSaving] = useState(false)

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('transactions')
        .select('*, customer:customers(id, user:users(full_name, phone))')
        .order('created_at', { ascending: false })
        .limit(100)

      if (filterDate) query = query.eq('date', filterDate)
      if (filterOp) query = query.eq('operation_type', filterOp)

      const branch = getSelectedBranch()
      if (branch) query = query.eq('branch_id', branch.id)

      const { data } = await query
      setTransactions(data || [])
    } finally {
      setLoading(false)
    }
  }, [filterDate, filterOp])

  const loadFormData = async () => {
    const [custs, machs, wals, tierData] = await Promise.all([
      supabase.from('customers').select('*, user:users(full_name, phone)').eq('user:users.account_status', 'active').limit(200),
      supabase.from('machines').select('*').eq('is_active', true),
      supabase.from('wallets').select('*').eq('is_active', true),
      supabase.from('pricing_tiers').select('*').eq('is_active', true).is('customer_id', null).order('tier_level'),
    ])
    setCustomers(custs.data || [])
    setMachines(machs.data || [])
    setWallets(wals.data || [])
    setTiers(tierData.data || [])
  }

  useEffect(() => { loadTransactions() }, [loadTransactions])
  useEffect(() => { if (showAdd) loadFormData() }, [showAdd])

  // حساب الرسوم تلقائياً
  useEffect(() => {
    if (!form.amount || isNaN(Number(form.amount))) { setFees(null); return }
    const amount = parseFloat(form.amount)
    if (amount <= 0) { setFees(null); return }

    // الشريحة الحالية للعميل (مبسط - يمكن تفصيله لاحقاً)
    const walletFees = parseFloat(form.wallet_fees) || 1
    const feeBase = settings?.service_fee_base ?? 5
    const feePer = settings?.service_fee_per ?? 500

    const calc = calculateFees(
      amount, form.operation_type, null,
      walletFees, feeBase, feePer
    )
    setFees(calc)
  }, [form.amount, form.operation_type, form.wallet_fees])

  const handleSubmit = async () => {
    if (!form.account_id) { toast.error('اختر الحساب'); return }
    if (!form.amount || isNaN(Number(form.amount))) { toast.error('أدخل المبلغ'); return }
    if (!fees) { toast.error('خطأ في حساب الرسوم'); return }

    setSaving(true)
    try {
      const branch = getSelectedBranch()
      const accountName = form.account_type === 'machine'
        ? machines.find(m => m.id === form.account_id)?.name || ''
        : wallets.find(w => w.id === form.account_id)?.name || ''

      const { error } = await supabase.from('transactions').insert({
        customer_id: form.customer_id || null,
        branch_id: branch?.id || null,
        date: new Date().toISOString().split('T')[0],
        account_type: form.account_type,
        account_id: form.account_id,
        account_name: accountName,
        operation_type: form.operation_type,
        amount: fees.amount,
        wallet_fees: fees.wallet_fees,
        service_fees: fees.final_service_fees,
        tier_discount_percent: fees.tier_discount_percent,
        tier_discount_amount: fees.tier_discount_amount,
        total_charged: fees.total_charged,
        profit: fees.profit,
        notes: form.notes || null,
        created_by: user?.id,
      })

      if (error) throw error

      toast.success('تم إضافة المعاملة بنجاح')
      setShowAdd(false)
      setForm({
        customer_id: '', account_type: 'cash', account_id: '',
        operation_type: 'transfer', amount: '',
        wallet_fees: String(settings?.wallet_default_fee ?? 1), notes: '',
      })
      setFees(null)
      loadTransactions()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const filtered = transactions.filter(t => {
    if (!searchQuery) return true
    const name = (t.customer as any)?.user?.full_name?.toLowerCase() || ''
    const phone = (t.customer as any)?.user?.phone || ''
    const q = searchQuery.toLowerCase()
    return name.includes(q) || phone.includes(q) || t.account_name.toLowerCase().includes(q)
  })

  const accountOptions = form.account_type === 'machine'
    ? machines.map(m => ({ value: m.id, label: `${m.name} (${m.company})` }))
    : wallets.map(w => ({ value: w.id, label: `${w.name} - ${w.phone}` }))

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">المعاملات</h1>
        <Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
          معاملة جديدة
        </Button>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="بحث باسم العميل أو الهاتف..."
            icon={<Search size={16} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 min-w-48"
          />
          <Input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="w-40"
          />
          <Select
            options={[
              { value: '', label: 'كل الأنواع' },
              { value: 'transfer', label: 'تحويل' },
              { value: 'withdrawal', label: 'سحب' },
              { value: 'recharge', label: 'شحن' },
            ]}
            value={filterOp}
            onChange={e => setFilterOp(e.target.value)}
            className="w-36"
          />
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner text="جاري التحميل..." />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📋"
            title="لا توجد معاملات"
            description="لم يتم العثور على معاملات بهذه المعايير"
            className="py-16"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">العميل</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">النوع</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">الحساب</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">المبلغ</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">المطلوب</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">الربح</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const op = OP_LABELS[t.operation_type]
                  const customer = (t.customer as any)
                  return (
                    <tr key={t.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        {customer ? (
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white">{customer.user?.full_name}</p>
                            <p className="text-xs text-gray-400">{customer.user?.phone}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">نقدي</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={op.color}>{op.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700 dark:text-gray-300">{t.account_name}</p>
                        <p className="text-xs text-gray-400">{t.account_type === 'machine' ? 'ماكينة' : 'محفظة'}</p>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="px-4 py-3 font-medium text-blue-600">
                        {formatCurrency(t.total_charged)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-600">
                        {formatCurrency(t.profit)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {formatDateTime(t.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal إضافة معاملة */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="معاملة جديدة" size="lg">
        <div className="space-y-4">
          {/* العميل */}
          <Select
            label="العميل"
            placeholder="نقدي (بدون عميل)"
            options={customers.map(c => ({
              value: c.id,
              label: `${(c.user as any)?.full_name} - ${(c.user as any)?.phone}`
            }))}
            value={form.customer_id}
            onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
          />

          {/* نوع الحساب */}
          <div className="flex gap-2">
            {(['cash', 'machine'] as const).map(type => (
              <button
                key={type}
                onClick={() => setForm(f => ({ ...f, account_type: type, account_id: '' }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  form.account_type === type
                    ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                    : 'border-gray-200 text-gray-500 dark:border-gray-600'
                }`}
              >
                {type === 'cash' ? '💼 محفظة إلكترونية' : '🖥️ ماكينة'}
              </button>
            ))}
          </div>

          {/* اختيار الحساب */}
          <Select
            label={form.account_type === 'machine' ? 'الماكينة' : 'المحفظة'}
            placeholder="اختر الحساب"
            options={accountOptions}
            value={form.account_id}
            onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}
            required
          />

          {/* نوع العملية */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">نوع العملية</label>
            <div className="flex gap-2">
              {(['transfer', 'withdrawal', 'recharge'] as const).map(op => (
                <button
                  key={op}
                  onClick={() => setForm(f => ({ ...f, operation_type: op }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.operation_type === op
                      ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                      : 'border-gray-200 text-gray-500 dark:border-gray-600'
                  }`}
                >
                  {op === 'transfer' ? 'تحويل' : op === 'withdrawal' ? 'سحب' : 'شحن'}
                </button>
              ))}
            </div>
          </div>

          {/* المبلغ + رسوم المحفظة */}
          <div className="flex gap-3">
            <Input
              label="المبلغ"
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="flex-1"
              required
            />
            <Input
              label="رسوم المحفظة"
              type="number"
              value={form.wallet_fees}
              onChange={e => setForm(f => ({ ...f, wallet_fees: e.target.value }))}
              className="w-28"
            />
          </div>

          {/* ملخص الرسوم */}
          {fees && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">المبلغ الأساسي</span>
                <span className="font-medium">{formatCurrency(fees.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">رسوم المحفظة</span>
                <span className="font-medium">{formatCurrency(fees.wallet_fees)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">رسوم الخدمة</span>
                <span className="font-medium">{formatCurrency(fees.final_service_fees)}</span>
              </div>
              <div className="border-t border-blue-100 dark:border-blue-800 pt-2 flex justify-between">
                <span className="font-semibold text-gray-700 dark:text-gray-200">المطلوب من العميل</span>
                <span className="font-bold text-blue-600 text-lg">{formatCurrency(fees.total_charged)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">الربح الصافي</span>
                <span className="font-semibold text-green-600">{formatCurrency(fees.profit)}</span>
              </div>
            </div>
          )}

          <Input
            label="ملاحظات (اختياري)"
            placeholder="أي ملاحظات..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>
              إلغاء
            </Button>
            <Button className="flex-1" loading={saving} onClick={handleSubmit}>
              إضافة المعاملة
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
