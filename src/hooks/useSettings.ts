import { useEffect } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'

export function useSettings() {
  const { settings, loadSettings, getSetting } = useSettingsStore()

  useEffect(() => {
    if (!settings) loadSettings()
  }, [])

  return { settings, getSetting }
}
