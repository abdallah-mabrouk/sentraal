import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, FileText, Wrench, ShoppingBag, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNotifications } from '@/hooks/useNotifications'
import { useBranchStore } from '@/stores/branchStore'
import { cn } from '@/utils/cn'
import { TickerBanner } from './TickerBanner'
import { DarkModeToggle } from '@/components/ui/DarkModeToggle'

const NAV = [
  { path: '/app', label: 'الرئيسية', icon: Home, exact: true },
  { path: '/app/statement', label: 'كشف الحساب', icon: FileText },
  { path: '/app/services', label: 'الخدمات', icon: Wrench },
  { path: '/app/products', label: 'المنتجات', icon: ShoppingBag },
  { path: '/app/profile', label: 'حسابي', icon: User },
]

export default function CustomerLayout() {
  const { user } = useAuthStore()
  const { unreadCount } = useNotifications()
  const { getSelectedBranch } = useBranchStore()
  const isPending = user?.account_status === 'pending'
  const location = useLocation()
  const branch = getSelectedBranch()

  // الصفحات المسموح بها في وضع المراجعة
  const allowedPending = ['/app/services', '/app/products']

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header مع زر الوضع الليلي */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-2xl">💳</div>
            <div>
              <h1 className="font-bold text-gray-800 dark:text-white text-sm">سنترال</h1>
              <p className="text-xs text-gray-400">{branch?.name || 'الفرع الرئيسي'}</p>
            </div>
          </div>
          <DarkModeToggle />
        </div>
      </header>

      {/* شريط الإعلانات */}
      {branch?.banner_message && (
        <TickerBanner message={branch.banner_message} color={branch.banner_color} />
      )}

      {/* تنبيه وضع المراجعة */}
      {isPending && (
        <div className="bg-yellow-500 text-white text-center py-2 px-4 text-xs font-medium">
          ⏳ حسابك قيد المراجعة - يمكنك تصفح الخدمات والمنتجات فقط
        </div>
      )}

      {/* المحتوى */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* شريط التنقل السفلي */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 safe-bottom z-30">
        <div className="flex">
          {NAV.map(item => {
            const isLocked = isPending && !allowedPending.some(p =>
              item.path === '/app' ? false : item.path.startsWith(p) || p.startsWith(item.path)
            ) && item.path !== '/app'

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                onClick={e => {
                  if (isLocked) {
                    e.preventDefault()
                  }
                }}
                className={({ isActive }) => cn(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative',
                  isActive && !isLocked
                    ? 'text-blue-600 dark:text-blue-400'
                    : isLocked
                    ? 'text-gray-300 dark:text-gray-600'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              >
                <div className="relative">
                  <item.icon size={22} />
                  {item.path === '/app/profile' && unreadCount > 0 && !isLocked && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  {isLocked && (
                    <span className="absolute -top-1 -right-1 text-xs">🔒</span>
                  )}
                </div>
                <span className="text-xs">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
