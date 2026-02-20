import { useNavigate } from 'react-router-dom'
import { Clock, Phone, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

export default function PendingPage() {
  const { user, signOut, loadUser } = useAuthStore()
  const navigate = useNavigate()

  // مراقبة تغيير حالة الحساب
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`user-status:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${user.id}`,
      }, async (payload) => {
        const updated = payload.new as any
        if (updated.account_status === 'active') {
          await loadUser()
          navigate('/app', { replace: true })
        } else if (updated.account_status === 'rejected') {
          await loadUser()
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  // العميل في وضع العرض فقط - يمكنه رؤية الخدمات والمنتجات
  const viewServices = () => navigate('/app/services')
  const viewProducts = () => navigate('/app/products')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={36} className="text-yellow-600" />
          </div>

          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            حسابك قيد المراجعة
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            سيتم مراجعة طلبك والموافقة عليه في أقرب وقت.
            ستصلك إشعار فور الموافقة.
          </p>

          {/* Contact */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 mb-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">للاستفسار تواصل معنا</p>
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Phone size={16} />
              <span className="font-medium">01xxxxxxxxx</span>
            </div>
          </div>

          {/* Browse while waiting */}
          <p className="text-xs text-gray-400 mb-3">يمكنك تصفح خدماتنا ومنتجاتنا في انتظار الموافقة</p>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" className="flex-1" onClick={viewServices}>
              🛠️ الخدمات
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={viewProducts}>
              🛍️ المنتجات
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-red-500"
            icon={<LogOut size={16} />}
            onClick={handleSignOut}
          >
            تسجيل الخروج
          </Button>
        </div>
      </div>
    </div>
  )
}
