import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useBranchStore } from '@/stores/branchStore'
import { PageLoader } from '@/components/ui/LoadingSpinner'

// Auth Pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const PendingPage = lazy(() => import('@/pages/auth/PendingPage'))

// Admin Pages
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminTransactions = lazy(() => import('@/pages/admin/TransactionsPage'))
const AdminCustomers = lazy(() => import('@/pages/admin/CustomersPage'))
const AdminCustomerDetail = lazy(() => import('@/pages/admin/CustomerDetailPage'))
const AdminAccounts = lazy(() => import('@/pages/admin/AccountsPage'))
const AdminInventory = lazy(() => import('@/pages/admin/InventoryPage'))
const AdminOffers = lazy(() => import('@/pages/admin/OffersPage'))
const AdminServices = lazy(() => import('@/pages/admin/ServicesPage'))
const AdminReports = lazy(() => import('@/pages/admin/ReportsPage'))
const AdminExpenses = lazy(() => import('@/pages/admin/ExpensesPage'))
const AdminCashRegister = lazy(() => import('@/pages/admin/CashRegisterPage'))
const AdminReminders = lazy(() => import('@/pages/admin/RemindersPage'))
const AdminRequests = lazy(() => import('@/pages/admin/ServiceRequestsPage'))
const AdminBranches = lazy(() => import('@/pages/admin/BranchesPage'))
const AdminRegistrations = lazy(() => import('@/pages/admin/RegistrationsPage'))
const AdminSettings = lazy(() => import('@/pages/admin/SettingsPage'))

// Customer Pages
const CustomerLayout = lazy(() => import('@/components/customer/CustomerLayout'))
const CustomerHome = lazy(() => import('@/pages/customer/HomePage'))
const CustomerStatement = lazy(() => import('@/pages/customer/StatementPage'))
const CustomerServices = lazy(() => import('@/pages/customer/ServicesPage'))
const CustomerProducts = lazy(() => import('@/pages/customer/ProductsPage'))
const CustomerRequest = lazy(() => import('@/pages/customer/RequestPage'))
const CustomerReminders = lazy(() => import('@/pages/customer/RemindersPage'))
const CustomerProfile = lazy(() => import('@/pages/customer/ProfilePage'))
const CustomerNotifications = lazy(() => import('@/pages/customer/NotificationsPage'))

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function ProtectedCustomerRoute({ children }: { children: React.ReactNode }) {
  const { user, isPendingCustomer } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (isPendingCustomer()) return <Navigate to="/pending" replace />
  return <>{children}</>
}

function PendingRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { loadUser } = useAuthStore()
  const { loadSettings } = useSettingsStore()
  const { loadBranches } = useBranchStore()

  useEffect(() => {
    loadUser()
    loadSettings()
    loadBranches()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          loadUser()
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            fontFamily: 'Cairo, sans-serif',
            fontSize: '14px',
            direction: 'rtl',
          },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pending" element={
            <PendingRoute><PendingPage /></PendingRoute>
          } />

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="customers/:id" element={<AdminCustomerDetail />} />
            <Route path="accounts" element={<AdminAccounts />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="offers" element={<AdminOffers />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="expenses" element={<AdminExpenses />} />
            <Route path="cash" element={<AdminCashRegister />} />
            <Route path="reminders" element={<AdminReminders />} />
            <Route path="requests" element={<AdminRequests />} />
            <Route path="branches" element={<AdminBranches />} />
            <Route path="registrations" element={<AdminRegistrations />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Customer */}
          <Route path="/app" element={
            <ProtectedCustomerRoute><CustomerLayout /></ProtectedCustomerRoute>
          }>
            <Route index element={<CustomerHome />} />
            <Route path="statement" element={<CustomerStatement />} />
            <Route path="services" element={<CustomerServices />} />
            <Route path="products" element={<CustomerProducts />} />
            <Route path="request" element={<CustomerRequest />} />
            <Route path="reminders" element={<CustomerReminders />} />
            <Route path="profile" element={<CustomerProfile />} />
            <Route path="notifications" element={<CustomerNotifications />} />
          </Route>

          {/* Redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function RootRedirect() {
  const { user, isAdmin, isPendingCustomer } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (isAdmin()) return <Navigate to="/admin" replace />
  if (isPendingCustomer()) return <Navigate to="/pending" replace />
  return <Navigate to="/app" replace />
}
