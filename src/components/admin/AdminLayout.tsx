import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Users, Cpu, Package,
  Tag, Wrench, BarChart3, Receipt, Wallet, Bell,
  GitBranch, Settings, LogOut, Menu, X, ClipboardList,
  UserCheck, ChevronRight
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/utils/cn'
import { DarkModeToggle } from '@/components/ui/DarkModeToggle'

const navItems = [
  { path: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard, exact: true },
  { path: '/admin/transactions', label: 'المعاملات', icon: ArrowLeftRight },
  { path: '/admin/customers', label: 'العملاء', icon: Users },
  { path: '/admin/accounts', label: 'الحسابات والماكينات', icon: Cpu },
  { path: '/admin/reminders', label: 'التذكيرات', icon: Bell },
  { path: '/admin/requests', label: 'طلبات الخدمة', icon: ClipboardList },
  { path: '/admin/registrations', label: 'طلبات التسجيل', icon: UserCheck },
  { path: '/admin/inventory', label: 'المخزون', icon: Package },
  { path: '/admin/offers', label: 'العروض', icon: Tag },
  { path: '/admin/services', label: 'الخدمات', icon: Wrench },
  { path: '/admin/reports', label: 'التقارير', icon: BarChart3 },
  { path: '/admin/expenses', label: 'المصروفات', icon: Receipt },
  { path: '/admin/cash', label: 'الدرج النقدي', icon: Wallet },
  { path: '/admin/branches', label: 'الفروع', icon: GitBranch },
  { path: '/admin/settings', label: 'الإعدادات', icon: Settings },
]

export default function AdminLayout() {
  const { user, signOut } = useAuthStore()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // إغلاق السايدبار عند تغيير الصفحة
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const currentPage = navItems.find(item =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  )

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 shadow-xl z-40',
        'flex flex-col transition-transform duration-300',
        'lg:relative lg:translate-x-0 lg:shadow-none lg:border-l lg:border-gray-100 dark:lg:border-gray-700',
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">س</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-800 dark:text-white">سنترال</h1>
              <p className="text-xs text-gray-400">لوحة الإدارة</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <item.icon size={18} />
              <span className="flex-1">{item.label}</span>
              {item.path === '/admin/requests' && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-300 text-sm font-bold">
                {user?.full_name[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-400">{user?.phone}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span>الرئيسية</span>
            {currentPage && currentPage.path !== '/admin' && (
              <>
                <ChevronRight size={14} className="rtl-flip" />
                <span className="text-gray-800 dark:text-white font-medium">{currentPage.label}</span>
              </>
            )}
          </div>
          <DarkModeToggle />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
