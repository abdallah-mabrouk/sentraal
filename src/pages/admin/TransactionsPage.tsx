import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useBranchStore } from '@/stores/branchStore'
import { useSettings } from '@/hooks/useSettings'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/fees'
import { formatDateTime } from '@/utils/dates'
import type { Transaction, Customer, Machine, Wallet } from '@/types'

type AccountType = 'machine' | 'cash'
type OperationType = 'recharge' | 'transfer' | 'withdrawal'

const OP_LABELS = {
  recharge: { label: 'شحن', color: 'success' as const },
  transfer: { label: 'تحويل', color: 'info' as const },
  withdrawal: { label: 'سحب', color: 'warning' as const },
}

export default function TransactionsPage() {
  const { user } = useAuthStore()
  const { getSelectedBranch } = useBranchStore()
  const { settings } = useSettings()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  
  // Form state
  const [accountType, setAccountType] = useState<AccountType>('machine')
  const [operationType, setOperationType] = useState<OperationType>('recharge')
  const [form, setForm] = useState({
    customer_id: '',
    account_id: '',
    amount: '',
    // للماكينة
    commission: '',
    // للكاش
    wallet_fees: '',
    service_fees: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  // Load data
  const loadTransactions = async () => {
    setLoading(true)
    try {
      const branch = getSelectedBranch()
      let query = supabase
        .from('transactions')
        .select('*, customer:customers(*, user:users(*))')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (branch) query = query.eq('branch_id', branch.id)
      if (filterDate) query = query.eq('date', filterDate)
      
      const { data } = await query
      setTransactions(data || [])
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    const [custRes, machRes, wallRes] = await Promise.all([
      supabase.from('customers').select('*, user:users(*)').eq('user:users.account_status', 'active'),
      supabase.from('machines').select('*').eq('is_active', true),
      supabase.from('wallets').select('*').eq('is_active', true),
    ])
    setCustomers(custRes.data || [])
    setMachines(machRes.data || [])
    setWallets(wallRes.data || [])
  }

  useEffect(() => { loadTransactions() }, [filterDate])
  useEffect(() => { loadAccounts() }, [])

  // Get selected customer for tier calculation
  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === form.customer_id),
    [customers, form.customer_id]
  )

  // Auto-calculate service fees with tier discount
  const calculatedServiceFees = useMemo(() => {
    if (accountType !== 'cash' || !form.amount || !settings) return 0
    
    const amount = parseFloat(form.amount)
    const base = settings.service_fee_base + (Math.floor(amount / settings.service_fee_per) * settings.service_fee_base)
    
    // Apply tier discount if customer selected
    if (selectedCustomer && selectedCustomer.tier) {
      const discount = operationType === 'transfer' 
        ? selectedCustomer.tier.cash_transfer_discount_percent || 0
        : selectedCustomer.tier.cash_withdrawal_discount_percent || 0
      return base * (1 - discount / 100)
    }
    
    return base
  }, [accountType, form.amount, operationType, selectedCustomer, settings])

  // Auto-fill service fees when calculated
  useEffect(() => {
    if (accountType === 'cash' && calculatedServiceFees > 0) {
      setForm(f => ({ ...f, service_fees: calculatedServiceFees.toFixed(2) }))
    }
  }, [calculatedServiceFees, accountType])

  // Auto-fill wallet fees
  useEffect(() => {
    if (accountType === 'cash' && settings) {
      setForm(f => ({ ...f, wallet_fees: String(settings.wallet_default_fee || 1) }))
    }
  }, [accountType, settings])

  // Calculate totals
  const totals = useMemo(() => {
    const amount = parseFloat(form.amount || '0')
    
    if (accountType === 'machine') {
      const commission = parseFloat(form.commission || '0')
      return {
        totalCharged: amount + commission,
        profit: commission,
      }
    } else {
      const walletFees = parseFloat(form.wallet_fees || '0')
      const serviceFees = parseFloat(form.service_fees || '0')
      return {
        totalCharged: amount + walletFees + serviceFees,
        profit: walletFees + serviceFees,
      }
    }
  }, [accountType, form.amount, form.commission, form.wallet_fees, form.service_fees])

  const handleAdd = async () => {
    if (!form.customer_id || !form.account_id || !form.amount) {
      toast.error('أدخل كل البيانات المطلوبة')
      return
    }

    setSaving(true)
    try {
      const branch = getSelectedBranch()
      const account = accountType === 'machine' 
        ? machines.find(m => m.id === form.account_id)
        : wallets.find(w => w.id === form.account_id)

      const transaction = {
        customer_id: form.customer_id,
        branch_id: branch?.id || null,
        date: new Date().toISOString().split('T')[0],
        account_type: accountType,
        account_id: form.account_id,
        account_name: account?.name || '',
        operation_type: operationType,
        amount: parseFloat(form.amount),
        wallet_fees: accountType === 'cash' ? parseFloat(form.wallet_fees) : 0,
        service_fees: accountType === 'cash' ? parseFloat(form.service_fees) : parseFloat(form.commission),
        total_charged: totals.totalCharged,
        profit: totals.profit,
        notes: form.notes || null,
        created_by: user?.id,
      }

      const { error } = await supabase.from('transactions').insert(transaction)
      if (error) throw error

      toast.success('تم إضافة المعاملة')
      setShowAdd(false)
      setForm({
        customer_id: '', account_id: '', amount: '',
        commission: '', wallet_fees: '', service_fees: '', notes: '',
      })
      loadTransactions()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const accountOptions = accountType === 'machine' 
    ? machines.map(m => ({ value: m.id, label: `${m.name} (${m.code})` }))
    : wallets.map(w => ({ value: w.id, label: `${w.name} (${w.phone})` }))

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">المعاملات</h1>
          <p className="text-sm text-gray-400">{transactions.length} معاملة اليوم</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
          معاملة جديدة
        </Button>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex gap-3">
          <Input
            placeholder="بحث..."
            icon={<Search size={16} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1"
          />
          <Input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            icon={<Calendar size={16} />}
            className="w-40"
          />
        </div>
      </Card>

      {/* Transactions List */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text="جاري التحميل..." />
        </div>
      ) : transactions.length === 0 ? (
        <Card>
          <EmptyState icon="📋" title="لا توجد معاملات" />
        </Card>
      ) : (
        <div className="grid gap-3">
          {transactions.map(t => {
            const op = OP_LABELS[t.operation_type as keyof typeof OP_LABELS]
            const customer = t.customer as any
            return (
              <Card key={t.id} padding="sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={op?.color || 'default'} size="sm">{op?.label}</Badge>
                      <span className="text-xs text-gray-400">
                        {t.account_type === 'machine' ? '🖥️ ماكينة' : '💵 كاش'}
                      </span>
                    </div>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {customer?.user?.full_name || 'عميل'} → {t.account_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(t.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {formatCurrency(t.amount)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">ربح: {formatCurrency(t.profit)}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="معاملة جديدة" size="lg">
        <div className="space-y-4">
          {/* Account Type Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              نوع الحساب
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAccountType('machine')
                  setOperationType('recharge')
                  setForm(f => ({ ...f, account_id: '' }))
                }}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  accountType === 'machine'
                    ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 text-gray-500'
                }`}
              >
                🖥️ ماكينة
              </button>
              <button
                onClick={() => {
                  setAccountType('cash')
                  setOperationType('transfer')
                  setForm(f => ({ ...f, account_id: '' }))
                }}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  accountType === 'cash'
                    ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 text-gray-500'
                }`}
              >
                💵 كاش
              </button>
            </div>
          </div>

          {/* Operation Type (Cash only) */}
          {accountType === 'cash' && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                نوع العملية
              </label>
              <div className="flex gap-2">
                {(['transfer', 'withdrawal'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setOperationType(type)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      operationType === type
                        ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500'
                    }`}
                  >
                    {type === 'transfer' ? '💸 تحويل' : '💵 سحب'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer */}
          <Select
            label="العميل"
            placeholder="اختر العميل"
            options={customers.map(c => ({
              value: c.id,
              label: `${(c.user as any)?.full_name} - ${(c.user as any)?.phone}`,
            }))}
            value={form.customer_id}
            onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
            required
          />

          {/* Account */}
          <Select
            label={accountType === 'machine' ? 'الماكينة' : 'المحفظة'}
            placeholder={`اختر ${accountType === 'machine' ? 'الماكينة' : 'المحفظة'}`}
            options={accountOptions}
            value={form.account_id}
            onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}
            required
          />

          {/* Amount */}
          <Input
            label="المبلغ"
            type="number"
            placeholder="0.00"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            required
          />

          {/* Machine Fields */}
          {accountType === 'machine' && (
            <Input
              label="العمولة (الربح)"
              type="number"
              placeholder="0.00"
              value={form.commission}
              onChange={e => setForm(f => ({ ...f, commission: e.target.value }))}
              hint="يمكنك تعديلها حسب الاتفاق مع العميل"
              required
            />
          )}

          {/* Cash Fields */}
          {accountType === 'cash' && (
            <>
              <Input
                label="رسوم المحفظة"
                type="number"
                placeholder="0.00"
                value={form.wallet_fees}
                onChange={e => setForm(f => ({ ...f, wallet_fees: e.target.value }))}
                hint="رسوم المحفظة الإلكترونية"
                required
              />
              <Input
                label="رسوم الخدمة"
                type="number"
                placeholder="0.00"
                value={form.service_fees}
                onChange={e => setForm(f => ({ ...f, service_fees: e.target.value }))}
                hint={selectedCustomer ? 
                  `محسوب تلقائياً مع خصم الشريحة: ${formatCurrency(calculatedServiceFees)}` :
                  'اختر العميل أولاً لحساب الخصم'
                }
                required
              />
            </>
          )}

          {/* Notes */}
          <Input
            label="ملاحظات (اختياري)"
            placeholder="أي ملاحظات..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />

          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">المبلغ:</span>
                <span className="font-medium">{formatCurrency(parseFloat(form.amount || '0'))}</span>
              </div>
              
              {accountType === 'machine' ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">العمولة:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(parseFloat(form.commission || '0'))}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">رسوم المحفظة:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(form.wallet_fees || '0'))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">رسوم الخدمة:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(form.service_fees || '0'))}</span>
                  </div>
                </>
              )}
              
              <div className="flex justify-between pt-2 border-t border-blue-200">
                <span className="font-semibold text-gray-800 dark:text-white">المطلوب من العميل:</span>
                <span className="font-bold text-blue-600 text-lg">
                  {formatCurrency(totals.totalCharged)}
                </span>
              </div>
              
              <div className="flex justify-between text-green-600">
                <span className="font-medium">الربح (لك):</span>
                <span className="font-bold text-lg">
                  {formatCurrency(totals.profit)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>
              إلغاء
            </Button>
            <Button className="flex-1" loading={saving} onClick={handleAdd}>
              إضافة المعاملة
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
