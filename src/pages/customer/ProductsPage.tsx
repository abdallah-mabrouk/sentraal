import { useState, useEffect } from 'react'
import { Search, MapPin, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/fees'
import type { Product, Category } from '@/types'

export default function ProductsPage() {
  const { user } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCat, setSelectedCat] = useState<string>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Product | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('*, category:categories(*)').eq('is_active', true).order('name'),
      supabase.from('categories').select('*').eq('is_active', true).order('display_order'),
    ]).then(([p, c]) => {
      setProducts(p.data || [])
      setCategories(c.data || [])
      setLoading(false)
    })
  }, [])

  const filtered = products.filter(p => {
    const matchCat = !selectedCat || p.category_id === selectedCat
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800 dark:text-white">المنتجات</h1>

      {/* بحث */}
      <Input
        placeholder="ابحث عن منتج..."
        icon={<Search size={16} />}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* فئات */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setSelectedCat('')}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            !selectedCat ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          الكل
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c.id)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedCat === c.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* المنتجات */}
      {filtered.length === 0 ? (
        <EmptyState icon="🛍️" title="لا توجد منتجات" description="حاول تغيير معايير البحث" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 text-right hover:shadow-md transition-shadow"
            >
              {p.images?.[0] ? (
                <img src={p.images[0]} alt={p.name} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-4xl">
                  {(p.category as any)?.icon || '📦'}
                </div>
              )}
              <div className="p-3">
                <p className="font-semibold text-gray-800 dark:text-white text-sm line-clamp-2">{p.name}</p>
                <p className="text-blue-600 font-bold mt-1">{formatCurrency(p.price)}</p>
                <Badge variant={p.stock_quantity > 0 ? 'success' : 'danger'} size="sm" className="mt-1">
                  {p.stock_quantity > 0 ? 'متوفر' : 'غير متوفر'}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* تفاصيل المنتج */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {selected.images?.[0] && (
              <img src={selected.images[0]} alt={selected.name} className="w-full h-48 object-cover rounded-2xl" />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{selected.name}</h2>
              <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(selected.price)}</p>
            </div>
            {selected.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{selected.description}</p>
            )}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                🏪 الشراء متاح فقط بالحضور للمحل
              </p>
              <div className="flex gap-3">
                <button className="flex items-center gap-1.5 text-sm text-blue-600 font-medium">
                  <MapPin size={14} />
                  الموقع
                </button>
                <button className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <Phone size={14} />
                  اتصل بنا
                </button>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
