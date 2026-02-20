import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { Branch } from '@/types'

interface BranchState {
  branches: Branch[]
  selectedBranchId: string | null
  isLoading: boolean
  loadBranches: () => Promise<void>
  selectBranch: (id: string) => void
  getSelectedBranch: () => Branch | null
  getMainBranch: () => Branch | null
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: [],
      selectedBranchId: null,
      isLoading: false,

      loadBranches: async () => {
        set({ isLoading: true })
        try {
          const { data } = await supabase
            .from('branches')
            .select('*')
            .eq('is_active', true)
            .order('is_main', { ascending: false })
          if (data) {
            set({ branches: data })
            // اختيار الفرع الرئيسي إذا لم يكن هناك اختيار
            if (!get().selectedBranchId && data.length > 0) {
              const main = data.find(b => b.is_main) || data[0]
              set({ selectedBranchId: main.id })
            }
          }
        } finally {
          set({ isLoading: false })
        }
      },

      selectBranch: (id) => set({ selectedBranchId: id }),

      getSelectedBranch: () => {
        const { branches, selectedBranchId } = get()
        return branches.find(b => b.id === selectedBranchId) || null
      },

      getMainBranch: () => {
        return get().branches.find(b => b.is_main) || null
      },
    }),
    {
      name: 'sentraal-branch',
      partialize: (state) => ({ selectedBranchId: state.selectedBranchId }),
    }
  )
)
