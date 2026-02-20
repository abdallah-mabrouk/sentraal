import { useState, useEffect } from 'react'
import { Plus, Download, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useBranchStore } from '@/stores/branchStore'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/fees'
import { formatDate, formatDateTime } from '@/utils/dates'
import type { Expense, Branch } from '@/types'

const CATEGORIES = [
  'إيجار',
  'كهرباء',
  'مياه',
  'إنترنت',
  'مرتبات',
  'صيانة',
  'تأمينات',
  'ضرائب',
  'مستلزمات',
  'أخرى',
]

export default function ExpensesPage() {
  const { user } = useAuthStore()
  const { branches, getSelectedBranch } = useBranchStore()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [filterCategory, setFilterCategory] = useState('')
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'أخرى',
    amount: '',
    notes: '',
    branch_id: '',
  })
  const [saving, setSaving] = useState(false)

  const loadExpenses = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('expenses')
        .select('*, branch:branches(*)')
        .order('date', { ascending: false })
        .limit(200)

      const branch = getSelectedBranch()
      if (branch) query = query.eq('branch_id', branch.id)

      const { data } = await query
      setExpenses(data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadExpenses() }, [])

  const handleAdd = async () => {
    if (!form.category || !form.amount || isNaN(Number(form.amount))) {
      toast.error('أدخل البيانات بشكل صحيح')
      return
    }
    setSaving(true)
    try {
      await supabase.from('expenses').insert({
        date: form.date,
        category: form.category,
        amount: parseFloat(form.amount),
        notes: form.notes || null,
        branch_id: form.branch_id || null,
        created_by: user?.id,
      })
      toast.success('تم إضافة المصروف')
      setShowAdd(false)
      setForm({
        date: new Date().toISOString().split('T')[0],
        category: 'أخرى',
        amount: '',
        notes: '',
        branch_id: '',
      })
      loadExpenses()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const filtered = expenses.filter(e => {
    const monthMatch = e.date.startsWith(filterMonth)
    const catMatch = !filterCategory || e.category === filterCategory
    return monthMatch && catMatch
  })

  const totalFiltered = filtered.reduce((sum, e) => sum + e.amount, 0)

  // تجميع حسب الفئة
  const byCategory = filtered.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {} as Record<string, number>)

  const categoryStats = Object.entries(byCategory)
    .map(([cat, amount]) => ({ category: cat, amount }))
    .sort((a, b) => b.amount - a.amount)

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">المصروفات</h1>
          <p className="text-sm text-gray-400">
            إجمالي {filterMonth}: <strong className="text-red-500">{formatCurrency(totalFiltered)}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<Download size={14} />}>
            تصدير
          </Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
            إضافة مصروف
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap gap-3">
          <Input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="w-40"
            icon={<Calendar size={16} />}
          />
          <Select
            options={[
              { value: '', label: 'كل الفئات' },
              ...CATEGORIES.map(c => ({ value: c, label: c })),
            ]}
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="w-40"
          />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categoryStats.slice(0, 4).map(stat => (
          <Card key={stat.category}>
            <p className="text-xs text-gray-400 mb-1">{stat.category}</p>
            <p className="text-lg font-bold text-red-500">{formatCurrency(stat.amount)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {Math.round((stat.amount / totalFiltered) * 100)}%
            </p>
          </Card>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text="جاري التحميل..." />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon="📋" title="لا توجد مصروفات" description="لم يتم تسجيل أي مصروف في هذا الشهر" />
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">التاريخ</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">الفئة</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">المبلغ</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">ملاحظات</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">الفرع</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {formatDate(e.date, 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{e.category}</Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold text-red-500">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {e.notes || '---'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {(e.branch as any)?.name || '---'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                  <td colSpan={2} className="px-4 py-3 text-gray-700 dark:text-gray-300">الإجمالي</td>
                  <td className="px-4 py-3 text-red-600 text-lg">
                    {formatCurrency(totalFiltered)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Add */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="إضافة مصروف" size="md">
        <div className="space-y-4">
          <Input
            label="التاريخ"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            required
          />
          <Select
            label="الفئة"
            options={CATEGORIES.map(c => ({ value: c, label: c }))}
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            required
          />
          <Input
            label="المبلغ"
            type="number"
            placeholder="0.00"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            required
          />
          <Input
            label="ملاحظات (اختياري)"
            placeholder="تفاصيل المصروف..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <Select
            label="الفرع (اختياري)"
            placeholder="اختر الفرع"
            options={branches.map(b => ({ value: b.id, label: b.name }))}
            value={form.branch_id}
            onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>
              إلغاء
            </Button>
            <Button className="flex-1" loading={saving} onClick={handleAdd}>
              إضافة المصروف
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
