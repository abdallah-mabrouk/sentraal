import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Phone, Mail, Calendar, MapPin, Gift, LogOut, Bell, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNotifications } from '@/hooks/useNotifications'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/utils/dates'

const TIER_LABELS = {
  vip: { label: 'VIP 💎', color: 'purple' as const },
  active: { label: 'نشط ⚡', color: 'success' as const },
  normal: { label: 'عادي', color: 'default' as const },
  inactive: { label: 'غير نشط', color: 'danger' as const },
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, customer, signOut } = useAuthStore()
  const { unreadCount } = useNotifications()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (!user || !customer) return null

  const tier = TIER_LABELS[customer.tier]

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl font-bold text-blue-600">{user.full_name?.[0]}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{user.full_name}</h2>
        <p className="text-sm text-gray-400">{user.phone}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant={tier.color}>{tier.label}</Badge>
        </div>
      </div>

      {/* Info */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-center gap-3 py-2">
            <Phone size={18} className="text-gray-400" />
            <div className="flex-1">
              <p className="text-xs text-gray-400">رقم الهاتف</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white">{user.phone}</p>
            </div>
          </div>
          {user.email && (
            <div className="flex items-center gap-3 py-2 border-t border-gray-100 dark:border-gray-700">
              <Mail size={18} className="text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-400">البريد الإلكتروني</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white">{user.email}</p>
              </div>
            </div>
          )}
          {user.birth_date && (
            <div className="flex items-center gap-3 py-2 border-t border-gray-100 dark:border-gray-700">
              <Calendar size={18} className="text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-400">تاريخ الميلاد</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {formatDate(user.birth_date, 'dd MMMM yyyy')}
                </p>
              </div>
            </div>
          )}
          {customer.area && (
            <div className="flex items-center gap-3 py-2 border-t border-gray-100 dark:border-gray-700">
              <MapPin size={18} className="text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-400">المنطقة</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white">{customer.area}</p>
              </div>
            </div>
          )}
          {customer.referral_code && (
            <div className="flex items-center gap-3 py-2 border-t border-gray-100 dark:border-gray-700">
              <Gift size={18} className="text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-400">كود الإحالة</p>
                <p className="text-sm font-mono font-bold text-purple-600">{customer.referral_code}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Menu */}
      <div className="space-y-2">
        <button
          onClick={() => navigate('/app/notifications')}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Bell size={18} className="text-blue-600" />
            </div>
            <span className="font-medium text-gray-800 dark:text-white">الإشعارات</span>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            <ChevronRight size={18} className="text-gray-400 rtl-flip" />
          </div>
        </button>
      </div>

      {/* Stats */}
      <Card>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-400 mb-1">المعاملات</p>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {customer.total_transactions_count}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">نقاط الولاء</p>
            <p className="text-lg font-bold text-purple-600">{customer.loyalty_points}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">عميل منذ</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white">
              {formatDate(customer.created_at, 'MMM yyyy')}
            </p>
          </div>
        </div>
      </Card>

      {/* Sign Out */}
      <Button
        variant="danger"
        className="w-full"
        icon={<LogOut size={18} />}
        onClick={handleSignOut}
      >
        تسجيل الخروج
      </Button>
    </div>
  )
}
