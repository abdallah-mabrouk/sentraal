import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'
import type { Service } from '@/types'

export default function ServicesPage() {
  const { user, isActiveCustomer } = useAuthStore()
  const navigate = useNavigate()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const isPending = user?.account_status === 'pending'

  useEffect(() => {
    supabase.from('services').select('*').eq('is_active', true).order('display_order')
      .then(({ data }) => { setServices(data || []); setLoading(false) })
  }, [])

  const handleRequest = (service: Service) => {
    if (isPending) return
    navigate('/app/request', { state: { service } })
  }

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800 dark:text-white">الخدمات</h1>
      {isPending && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700 dark:text-yellow-400">
          🔒 يمكنك طلب الخدمات بعد الموافقة على حسابك
        </div>
      )}
      {services.length === 0 ? (
        <EmptyState icon="🛠️" title="لا توجد خدمات متاحة" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {services.map(s => (
            <button
              key={s.id}
              onClick={() => handleRequest(s)}
              disabled={isPending}
              className={cn(
                'bg-white dark:bg-gray-800 rounded-2xl p-5 text-center shadow-sm border border-gray-100 dark:border-gray-700',
                'transition-all duration-200',
                isPending
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-md hover:border-blue-200 active:scale-95'
              )}
            >
              <div className="text-3xl mb-3">{s.icon || '⚡'}</div>
              <p className="font-semibold text-gray-800 dark:text-white text-sm">{s.name}</p>
              {s.description && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{s.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
