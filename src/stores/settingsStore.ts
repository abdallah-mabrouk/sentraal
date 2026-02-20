import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Settings } from '@/types'

interface SettingsState {
  settings: Settings | null
  isLoading: boolean
  loadSettings: () => Promise<void>
  getSetting: (key: keyof Settings) => any
}

const DEFAULTS: Settings = {
  wallet_default_fee: 1,
  service_fee_base: 5,
  service_fee_per: 500,
  loyalty_points_per: 500,
  loyalty_points_value: 10,
  referral_required_amount: 1000,
  referral_reward_amount: 50,
  vip_threshold: 50000,
  active_threshold: 10000,
  inactive_days: 30,
  app_name: 'سنترال',
  currency: 'ج',
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULTS,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true })
    try {
      const { data } = await supabase.from('settings').select('key, value')
      if (data) {
        const parsed: any = { ...DEFAULTS }
        data.forEach(({ key, value }) => {
          if (key in DEFAULTS) {
            const def = DEFAULTS[key as keyof Settings]
            parsed[key] = typeof def === 'number' ? parseFloat(value) : value
          }
        })
        set({ settings: parsed })
      }
    } catch (e) {
      console.error('loadSettings error:', e)
    } finally {
      set({ isLoading: false })
    }
  },

  getSetting: (key) => get().settings?.[key] ?? DEFAULTS[key],
}))
