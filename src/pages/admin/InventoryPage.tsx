import { useState, useEffect } from 'react'
import { Plus, Edit, Package, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/fees'
import type { Product, Category } from '@/types'

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedCat, setSelectedCat] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    name: '',
    category_id: '',
    price: '',
    stock_quantity: '0',
    description: '',
  })
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)').order('name'),
        supabase.from('categories').select('*').eq('is_active', true).order('display_order'),
      ])
      setProducts(pRes.data || [])
      setCategories(cRes.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleAdd = async () => {
    if (!form.name || !form.price) {
      toast.error('أدخل الاسم والسعر')
      return
    }
    setSaving(true)
    try {
      await supabase.from('products').insert({
        name: form.name,
        category_id: form.category_id || null,
        price: parseFloat(form.price),
        stock_quantity: parseInt(form.stock_quantity),
        description: form.description || null,
        is_active: true,
      })
      toast.success('تم إضافة المنتج')
      setShowAdd(false)
      setForm({ name: '', category_id: '', price: '', stock_quantity: '0', description: '' })
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const filtered = products.filter(p => {
    const catMatch = !selectedCat || p.category_id === selectedCat
    const searchMatch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return catMatch && searchMatch
  })

  const lowStock = products.filter(p => p.stock_quantity < 5)

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">المخزون</h1>
          <p className="text-sm text-gray-400">{products.length} منتج</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
          إضافة منتج
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <Card className="border-2 border-yellow-500">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-yellow-700 dark:text-yellow-400 mb-1">
                ⚠️ {lowStock.length} منتج ينفد من المخزون
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lowStock.map(p => p.name).join(', ')}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card padding="sm">
        <div className="flex gap-3">
          <Input
            placeholder="بحث عن منتج..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1"
          />
          <Select
            options={[
              { value: '', label: 'كل الفئات' },
              ...categories.map(c => ({ value: c.id, label: `${c.icon || ''} ${c.name}` })),
            ]}
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
            className="w-48"
          />
        </div>
      </Card>

      {/* Products Grid */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text="جاري التحميل..." />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon="📦" title="لا توجد منتجات" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <Card key={p.id}>
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-2xl shrink-0">
                  {(p.category as any)?.icon || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 dark:text-white truncate">{p.name}</h3>
                  <p className="text-xs text-gray-400">
                    {(p.category as any)?.name || 'بدون فئة'}
                  </p>
                  <p className="text-lg font-bold text-blue-600 mt-1">{formatCurrency(p.price)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-gray-400" />
                  <span className={`text-sm font-medium ${
                    p.stock_quantity < 5 ? 'text-red-500' : 
                    p.stock_quantity < 10 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {p.stock_quantity} قطعة
                  </span>
                </div>
                <Badge variant={p.is_active ? 'success' : 'danger'}>
                  {p.is_active ? 'نشط' : 'موقوف'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Add */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="إضافة منتج" size="md">
        <div className="space-y-4">
          <Input
            label="اسم المنتج"
            placeholder="مثال: سماعة بلوتوث"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <Select
            label="الفئة"
            placeholder="اختر الفئة"
            options={categories.map(c => ({ value: c.id, label: `${c.icon || ''} ${c.name}` }))}
            value={form.category_id}
            onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="السعر"
              type="number"
              placeholder="0.00"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              required
            />
            <Input
              label="الكمية"
              type="number"
              value={form.stock_quantity}
              onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))}
            />
          </div>
          <Input
            label="الوصف (اختياري)"
            placeholder="وصف المنتج..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>
              إلغاء
            </Button>
            <Button className="flex-1" loading={saving} onClick={handleAdd}>
              إضافة المنتج
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
