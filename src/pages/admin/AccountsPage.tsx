import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Toggle } from '@/components/ui/Toggle'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatCurrency } from '@/utils/fees'
import type { Machine, Wallet, Branch } from '@/types'

type TabType = 'machines' | 'wallets'

export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('machines')
  const [machines, setMachines] = useState<Machine[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Machine form
  const [machineForm, setMachineForm] = useState({
    name: '', code: '', company: 'فوري', account_number: '',
    current_balance: '0', branch_id: '', is_active: true,
  })

  // Wallet form
  const [walletForm, setWalletForm] = useState({
    name: '', phone: '', current_balance: '0',
    daily_withdrawal_limit: '0', daily_transfer_limit: '0',
    monthly_withdrawal_limit: '0', monthly_transfer_limit: '0',
    branch_id: '', is_active: true,
  })

  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [mRes, wRes, bRes] = await Promise.all([
        supabase.from('machines').select('*, branch:branches(*)').order('created_at', { ascending: false }),
        supabase.from('wallets').select('*, branch:branches(*)').order('created_at', { ascending: false }),
        supabase.from('branches').select('*').eq('is_active', true),
      ])
      setMachines(mRes.data || [])
      setWallets(wRes.data || [])
      setBranches(bRes.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleAddMachine = async () => {
    if (!machineForm.name || !machineForm.code) {
      toast.error('أدخل الاسم والكود')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await supabase.from('machines').update(machineForm).eq('id', editingId)
        toast.success('تم التحديث')
      } else {
        await supabase.from('machines').insert(machineForm)
        toast.success('تم إضافة الماكينة')
      }
      setShowAdd(false)
      setEditingId(null)
      setMachineForm({
        name: '', code: '', company: 'فوري', account_number: '',
        current_balance: '0', branch_id: '', is_active: true,
      })
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleAddWallet = async () => {
    if (!walletForm.name || !walletForm.phone) {
      toast.error('أدخل الاسم ورقم الهاتف')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await supabase.from('wallets').update(walletForm).eq('id', editingId)
        toast.success('تم التحديث')
      } else {
        await supabase.from('wallets').insert(walletForm)
        toast.success('تم إضافة المحفظة')
      }
      setShowAdd(false)
      setEditingId(null)
      setWalletForm({
        name: '', phone: '', current_balance: '0',
        daily_withdrawal_limit: '0', daily_transfer_limit: '0',
        monthly_withdrawal_limit: '0', monthly_transfer_limit: '0',
        branch_id: '', is_active: true,
      })
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      if (activeTab === 'machines') {
        await supabase.from('machines').delete().eq('id', deleteId)
      } else {
        await supabase.from('wallets').delete().eq('id', deleteId)
      }
      toast.success('تم الحذف')
      setDeleteId(null)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    }
  }

  const openEdit = (item: Machine | Wallet) => {
    setEditingId(item.id)
    if (activeTab === 'machines') {
      const m = item as Machine
      setMachineForm({
        name: m.name,
        code: m.code,
        company: m.company,
        account_number: m.account_number || '',
        current_balance: String(m.current_balance),
        branch_id: m.branch_id || '',
        is_active: m.is_active,
      })
    } else {
      const w = item as Wallet
      setWalletForm({
        name: w.name,
        phone: w.phone,
        current_balance: String(w.current_balance),
        daily_withdrawal_limit: String(w.daily_withdrawal_limit),
        daily_transfer_limit: String(w.daily_transfer_limit),
        monthly_withdrawal_limit: String(w.monthly_withdrawal_limit),
        monthly_transfer_limit: String(w.monthly_transfer_limit),
        branch_id: w.branch_id || '',
        is_active: w.is_active,
      })
    }
    setShowAdd(true)
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('machines')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'machines'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            🖥️ الماكينات ({machines.length})
          </button>
          <button
            onClick={() => setActiveTab('wallets')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'wallets'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            💼 المحافظ ({wallets.length})
          </button>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={loadData}>
            تحديث
          </Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
            إضافة {activeTab === 'machines' ? 'ماكينة' : 'محفظة'}
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text="جاري التحميل..." />
        </div>
      ) : activeTab === 'machines' ? (
        machines.length === 0 ? (
          <Card><EmptyState icon="🖥️" title="لا توجد ماكينات" /></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {machines.map(m => (
              <Card key={m.id}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{m.name}</h3>
                    <p className="text-xs text-gray-400">{m.code} • {m.company}</p>
                  </div>
                  <Badge variant={m.is_active ? 'success' : 'danger'}>
                    {m.is_active ? 'نشط' : 'موقوف'}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">الرصيد</span>
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {formatCurrency(m.current_balance)}
                    </span>
                  </div>
                  {m.account_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">رقم الحساب</span>
                      <span className="text-gray-700 dark:text-gray-300">{m.account_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">الفرع</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {(m.branch as any)?.name || '---'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <Button variant="outline" size="sm" className="flex-1" icon={<Edit size={14} />} onClick={() => openEdit(m)}>
                    تعديل
                  </Button>
                  <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteId(m.id)}>
                    حذف
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        wallets.length === 0 ? (
          <Card><EmptyState icon="💼" title="لا توجد محافظ" /></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {wallets.map(w => (
              <Card key={w.id}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{w.name}</h3>
                    <p className="text-xs text-gray-400">{w.phone}</p>
                  </div>
                  <Badge variant={w.is_active ? 'success' : 'danger'}>
                    {w.is_active ? 'نشط' : 'موقوف'}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">الرصيد</span>
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {formatCurrency(w.current_balance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">حد السحب اليومي</span>
                    <span className="text-gray-700 dark:text-gray-300">{formatCurrency(w.daily_withdrawal_limit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">حد التحويل اليومي</span>
                    <span className="text-gray-700 dark:text-gray-300">{formatCurrency(w.daily_transfer_limit)}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <Button variant="outline" size="sm" className="flex-1" icon={<Edit size={14} />} onClick={() => openEdit(w)}>
                    تعديل
                  </Button>
                  <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteId(w.id)}>
                    حذف
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Modal Add/Edit Machine */}
      {activeTab === 'machines' && (
        <Modal
          isOpen={showAdd}
          onClose={() => { setShowAdd(false); setEditingId(null) }}
          title={editingId ? 'تعديل ماكينة' : 'إضافة ماكينة'}
          size="md"
        >
          <div className="space-y-4">
            <Input
              label="اسم الماكينة"
              placeholder="مثال: ماكينة فوري 1"
              value={machineForm.name}
              onChange={e => setMachineForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="الكود"
              placeholder="M001"
              value={machineForm.code}
              onChange={e => setMachineForm(f => ({ ...f, code: e.target.value }))}
              required
            />
            <Select
              label="الشركة"
              options={[
                { value: 'فوري', label: 'فوري' },
                { value: 'بساطة', label: 'بساطة' },
                { value: 'أخرى', label: 'أخرى' },
              ]}
              value={machineForm.company}
              onChange={e => setMachineForm(f => ({ ...f, company: e.target.value }))}
              required
            />
            <Input
              label="رقم الحساب (اختياري)"
              placeholder="123456"
              value={machineForm.account_number}
              onChange={e => setMachineForm(f => ({ ...f, account_number: e.target.value }))}
            />
            <Input
              label="الرصيد الحالي"
              type="number"
              value={machineForm.current_balance}
              onChange={e => setMachineForm(f => ({ ...f, current_balance: e.target.value }))}
            />
            <Select
              label="الفرع (اختياري)"
              placeholder="اختر الفرع"
              options={branches.map(b => ({ value: b.id, label: b.name }))}
              value={machineForm.branch_id}
              onChange={e => setMachineForm(f => ({ ...f, branch_id: e.target.value }))}
            />
            <Toggle
              checked={machineForm.is_active}
              onChange={v => setMachineForm(f => ({ ...f, is_active: v }))}
              label="نشط"
            />
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setShowAdd(false); setEditingId(null) }}>
                إلغاء
              </Button>
              <Button className="flex-1" loading={saving} onClick={handleAddMachine}>
                {editingId ? 'تحديث' : 'إضافة'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Add/Edit Wallet */}
      {activeTab === 'wallets' && (
        <Modal
          isOpen={showAdd}
          onClose={() => { setShowAdd(false); setEditingId(null) }}
          title={editingId ? 'تعديل محفظة' : 'إضافة محفظة'}
          size="lg"
        >
          <div className="space-y-4">
            <Input
              label="اسم المحفظة"
              placeholder="مثال: فودافون كاش"
              value={walletForm.name}
              onChange={e => setWalletForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="رقم الهاتف"
              type="tel"
              placeholder="01xxxxxxxxx"
              value={walletForm.phone}
              onChange={e => setWalletForm(f => ({ ...f, phone: e.target.value }))}
              required
            />
            <Input
              label="الرصيد الحالي"
              type="number"
              value={walletForm.current_balance}
              onChange={e => setWalletForm(f => ({ ...f, current_balance: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="حد السحب اليومي"
                type="number"
                value={walletForm.daily_withdrawal_limit}
                onChange={e => setWalletForm(f => ({ ...f, daily_withdrawal_limit: e.target.value }))}
              />
              <Input
                label="حد التحويل اليومي"
                type="number"
                value={walletForm.daily_transfer_limit}
                onChange={e => setWalletForm(f => ({ ...f, daily_transfer_limit: e.target.value }))}
              />
              <Input
                label="حد السحب الشهري"
                type="number"
                value={walletForm.monthly_withdrawal_limit}
                onChange={e => setWalletForm(f => ({ ...f, monthly_withdrawal_limit: e.target.value }))}
              />
              <Input
                label="حد التحويل الشهري"
                type="number"
                value={walletForm.monthly_transfer_limit}
                onChange={e => setWalletForm(f => ({ ...f, monthly_transfer_limit: e.target.value }))}
              />
            </div>
            <Select
              label="الفرع (اختياري)"
              placeholder="اختر الفرع"
              options={branches.map(b => ({ value: b.id, label: b.name }))}
              value={walletForm.branch_id}
              onChange={e => setWalletForm(f => ({ ...f, branch_id: e.target.value }))}
            />
            <Toggle
              checked={walletForm.is_active}
              onChange={v => setWalletForm(f => ({ ...f, is_active: v }))}
              label="نشط"
            />
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setShowAdd(false); setEditingId(null) }}>
                إلغاء
              </Button>
              <Button className="flex-1" loading={saving} onClick={handleAddWallet}>
                {editingId ? 'تحديث' : 'إضافة'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="تأكيد الحذف"
        message={`هل تريد حذف هذا ${activeTab === 'machines' ? 'الماكينة' : 'المحفظة'}؟`}
        confirmText="حذف"
        variant="danger"
      />
    </div>
  )
}
