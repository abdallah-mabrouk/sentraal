import { useEffect } from 'react'
import { useBranchStore } from '@/stores/branchStore'

export function useBranch() {
  const store = useBranchStore()

  useEffect(() => {
    if (store.branches.length === 0) store.loadBranches()
  }, [])

  return store
}
