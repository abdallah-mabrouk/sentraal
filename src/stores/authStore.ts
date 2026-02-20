import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { User, Customer } from '@/types'

interface AuthState {
  user: User | null
  customer: Customer | null
  isLoading: boolean
  isAdmin: () => boolean
  isActiveCustomer: () => boolean
  isPendingCustomer: () => boolean
  signIn: (phone: string, password: string) => Promise<void>
  signUp: (data: SignUpData) => Promise<void>
  signOut: () => Promise<void>
  loadUser: () => Promise<void>
}

export interface SignUpData {
  phone: string
  password: string
  full_name: string
  email?: string
  gender?: string
  birth_date?: string
  referral_code?: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      customer: null,
      isLoading: false,

      isAdmin: () =>
        get().user?.role === 'admin' && get().user?.account_status === 'active',

      isActiveCustomer: () =>
        get().user?.role === 'customer' && get().user?.account_status === 'active',

      isPendingCustomer: () =>
        get().user?.role === 'customer' && get().user?.account_status === 'pending',

      signIn: async (phone, password) => {
        set({ isLoading: true })
        try {
          const email = `${phone}@sentraal.app`
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) {
            if (error.message.includes('Invalid login credentials'))
              throw new Error('رقم الهاتف أو كلمة المرور غير صحيحة')
            throw error
          }
          await get().loadUser()
        } finally {
          set({ isLoading: false })
        }
      },

      signUp: async (data) => {
        set({ isLoading: true })
        try {
          const email = `${data.phone}@sentraal.app`
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password: data.password,
          })
          if (authError) throw authError
          if (!authData.user) throw new Error('فشل إنشاء الحساب')

          const { error: userError } = await supabase.from('users').insert({
            id: authData.user.id,
            phone: data.phone,
            email: data.email || null,
            full_name: data.full_name,
            gender: data.gender || null,
            birth_date: data.birth_date || null,
            role: 'customer',
            account_status: 'pending',
          })
          if (userError) throw userError

          const { error: customerError } = await supabase.from('customers').insert({
            user_id: authData.user.id,
          })
          if (customerError) throw customerError

          // معالجة كود الإحالة
          if (data.referral_code) {
            const { data: referrer } = await supabase
              .from('customers')
              .select('id')
              .eq('referral_code', data.referral_code.toUpperCase())
              .single()

            if (referrer) {
              const { data: newCust } = await supabase
                .from('customers')
                .select('id')
                .eq('user_id', authData.user.id)
                .single()

              const { data: settingsData } = await supabase
                .from('settings')
                .select('key, value')
                .in('key', ['referral_required_amount', 'referral_reward_amount'])

              const req = settingsData?.find(s => s.key === 'referral_required_amount')?.value ?? '1000'
              const reward = settingsData?.find(s => s.key === 'referral_reward_amount')?.value ?? '50'

              if (newCust) {
                await supabase.from('referrals').insert({
                  referrer_id: referrer.id,
                  referred_id: newCust.id,
                  required_amount: parseFloat(req),
                  reward_amount: parseFloat(reward),
                })
              }
            }
          }

          await get().loadUser()
        } finally {
          set({ isLoading: false })
        }
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, customer: null })
      },

      loadUser: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) { set({ user: null, customer: null }); return }

          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (!userData) { set({ user: null, customer: null }); return }
          set({ user: userData })

          if (userData.role === 'customer') {
            const { data: customerData } = await supabase
              .from('customers')
              .select('*, user:users(*), branch:branches(*)')
              .eq('user_id', session.user.id)
              .single()
            set({ customer: customerData })
          }
        } catch (e) {
          console.error('loadUser error:', e)
        }
      },
    }),
    {
      name: 'sentraal-auth',
      partialize: (state) => ({ user: state.user, customer: state.customer }),
    }
  )
)
