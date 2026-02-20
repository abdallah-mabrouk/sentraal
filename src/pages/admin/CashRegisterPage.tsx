import { useState, useEffect } from 'react'
import { Calendar, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useBranchStore } from '@/stores/branchStore'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/utils/fees'
import { formatDate } from '@/utils/dates'
import type { CashRegister } from '@/types'

export default function CashRegisterPage() {
  const { user } = useAuthStore()
  const { getSelectedBranch } = useBranchStore()
  const [history, setHistory] = useState<CashRegister[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [form, setForm] = useState({
    notes_200: '0',
    notes_100: '0',
    notes_50: '0',
    notes_20: '0',
    notes_10: '0',
    notes_5: '0',
    coins: '0',
    expected_balance: '0',
  })
  const [saving, setSaving] = useState(false)

  const loadHistory = async () => {
    setLoading(true)
    try {
      const branch = getSelectedBranch()
      let query = supabase
        .from('cash_register')
        .select('*')
        .order('date', { ascending: false })
        .limit(30)
      if (branch) query = query.eq('branch_id', branch.id)
      const { data } = await query
      setHistory(data || [])
    } finally {
      setLoading(false)
    }
  }

  const loadToday = async () => {
    const branch = getSelectedBranch()
    let query = supabase
      .from('cash_register')
      .select('*')
      .eq('date', selectedDate)
    if (branch) query = query.eq('branch_id', branch.id)
    const { data } = await query.single()
    if (data) {
      setForm({
        notes_200: String(data.notes_200),
        notes_100: String(data.notes_100),
        notes_50: String(data.notes_50),
        notes_20: String(data.notes_20),
        notes_10: String(data.notes_10),
        notes_5: String(data.notes_5),
        coins: String(data.coins),
        expected_balance: String(data.expected_balance || 0),
      })
    }
  }

  useEffect(() => { loadHistory() }, [])
  useEffect(() => { loadToday() }, [selectedDate])

  const totalCalculated =
    parseInt(form.notes_200 || '0') * 200 +
    parseInt(form.notes_100 || '0') * 100 +
    parseInt(form.notes_50 || '0') * 50 +
    parseInt(form.notes_20 || '0') * 20 +
    parseInt(form.notes_10 || '0') * 10 +
    parseInt(form.notes_5 || '0') * 5 +
    parseFloat(form.coins || '0')

  const expectedBalance = parseFloat(form.expected_balance || '0')
  const difference = totalCalculated - expectedBalance

  const handleSave = async () => {
    setSaving(true)
    try {
      const branch = getSelectedBranch()
      const record = {
        date: selectedDate,
        notes_200: parseInt(form.notes_200),
        notes_100: parseInt(form.notes_100),
        notes_50: parseInt(form.notes_50),
        notes_20: parseInt(form.notes_20),
        notes_10: parseInt(form.notes_10),
        notes_5: parseInt(form.notes_5),
        coins: parseFloat(form.coins),
        expected_balance: expectedBalance,
        difference,
        branch_id: branch?.id || null,
        created_by: user?.id,
      }

      // تحديث أو إدراج
      const { data: existing } = await supabase
        .from('cash_register')
        .select('id')
        .eq('date', selectedDate)
        .eq('branch_id', branch?.id || null)
        .single()

      if (existing) {
        await supabase.from('cash_register').update(record).eq('id', existing.id)
      } else {
        await supabase.from('cash_register').insert(record)
      }

      toast.success('تم حفظ الجرد')
      loadHistory()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">الدرج النقدي</h1>
        <p className="text-sm text-gray-400">جرد يومي للنقدية</p>
      </div>

      {/* Date */}
      <Card>
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-gray-400" />
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="flex-1"
          />
        </div>
      </Card>

      {/* Count Form */}
      <Card>
        <CardHeader>
          <CardTitle>عد الأوراق النقدية والفكة</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'ورقة 200 ج', key: 'notes_200', value: 200 },
            { label: 'ورقة 100 ج', key: 'notes_100', value: 100 },
            { label: 'ورقة 50 ج', key: 'notes_50', value: 50 },
            { label: 'ورقة 20 ج', key: 'notes_20', value: 20 },
            { label: 'ورقة 10 ج', key: 'notes_10', value: 10 },
            { label: 'ورقة 5 ج', key: 'notes_5', value: 5 },
          ].map(item => {
            const count = parseInt((form as any)[item.key] || '0')
            const total = count * item.value
            return (
              <div key={item.key}>
                <Input
                  label={item.label}
                  type="number"
                  value={(form as any)[item.key]}
                  onChange={e => setForm(f => ({ ...f, [item.key]: e.target.value }))}
                  hint={count > 0 ? `= ${formatCurrency(total)}` : undefined}
                />
              </div>
            )
          })}
          <div className="col-span-2">
            <Input
              label="الفكة (عملات معدنية)"
              type="number"
              step="0.01"
              value={form.coins}
              onChange={e => setForm(f => ({ ...f, coins: e.target.value }))}
            />
          </div>
        </div>
      </Card>

      {/* Expected vs Actual */}
      <Card>
        <CardHeader>
          <CardTitle>المقارنة</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <Input
            label="الرصيد المتوقع (من النظام)"
            type="number"
            value={form.expected_balance}
            onChange={e => setForm(f => ({ ...f, expected_balance: e.target.value }))}
            hint="يمكنك حسابه من: مجموع المعاملات النقدية - المصروفات"
          />

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-xs text-blue-600 mb-1">المحسوب</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(totalCalculated)}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">المتوقع</p>
              <p className="text-lg font-bold text-gray-800 dark:text-white">
                {formatCurrency(expectedBalance)}
              </p>
            </div>
            <div className={`text-center p-3 rounded-xl ${
              Math.abs(difference) < 1
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <p className="text-xs text-gray-400 mb-1">الفرق</p>
              <p className={`text-lg font-bold ${
                Math.abs(difference) < 1 ? 'text-green-600' : 'text-red-500'
              }`}>
                {difference > 0 ? '+' : ''}{formatCurrency(difference)}
              </p>
            </div>
          </div>

          {Math.abs(difference) >= 1 && (
            <div className={`flex items-start gap-2 p-3 rounded-xl ${
              Math.abs(difference) < 50
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200'
            }`}>
              <AlertTriangle size={18} className={Math.abs(difference) < 50 ? 'text-yellow-600' : 'text-red-600'} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  Math.abs(difference) < 50 ? 'text-yellow-700' : 'text-red-700'
                }`}>
                  يوجد فرق في الرصيد
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {difference > 0
                    ? 'الدرج يحتوي على نقدية أكثر من المتوقع (زيادة)'
                    : 'الدرج يحتوي على نقدية أقل من المتوقع (عجز)'}
                </p>
              </div>
            </div>
          )}

          {Math.abs(difference) < 1 && (
            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl">
              <CheckCircle size={18} className="text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-700">الجرد مطابق ✓</p>
                <p className="text-xs text-gray-500 mt-1">الرصيد المحسوب يطابق المتوقع</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Save */}
      <Button className="w-full" size="lg" loading={saving} onClick={handleSave}>
        حفظ الجرد
      </Button>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>السجل (آخر 30 يوم)</CardTitle>
        </CardHeader>
        {loading ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner size="sm" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">لا يوجد سجل</p>
        ) : (
          <div className="space-y-2">
            {history.map(h => (
              <div
                key={h.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {formatDate(h.date, 'dd/MM/yyyy')}
                  </p>
                  <p className="text-xs text-gray-400">
                    محسوب: {formatCurrency(h.total_calculated || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    فرق: {h.difference > 0 ? '+' : ''}{formatCurrency(h.difference)}
                  </p>
                  <Badge
                    variant={
                      Math.abs(h.difference) < 1 ? 'success' :
                      Math.abs(h.difference) < 50 ? 'warning' : 'danger'
                    }
                    size="sm"
                  >
                    {Math.abs(h.difference) < 1 ? 'مطابق' :
                     Math.abs(h.difference) < 50 ? 'فرق بسيط' : 'فرق كبير'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
