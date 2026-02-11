import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ClinicalMode } from '@/config/modes'

interface SettingsStore {
  defaultWard: string
  defaultMode: ClinicalMode
  compactView: boolean
  showAISuggestions: boolean
  labTrendDays: number
  notifyCriticalLabs: boolean
  notifyTaskReminders: boolean
  notifyHandoverAlerts: boolean
  setDefaultWard: (ward: string) => void
  setDefaultMode: (mode: ClinicalMode) => void
  setCompactView: (compact: boolean) => void
  setShowAISuggestions: (show: boolean) => void
  setLabTrendDays: (days: number) => void
  setNotifyCriticalLabs: (notify: boolean) => void
  setNotifyTaskReminders: (notify: boolean) => void
  setNotifyHandoverAlerts: (notify: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      defaultWard: '',
      defaultMode: 'ward',
      compactView: false,
      showAISuggestions: true,
      labTrendDays: 7,
      notifyCriticalLabs: true,
      notifyTaskReminders: true,
      notifyHandoverAlerts: true,
      setDefaultWard: (defaultWard) => set({ defaultWard }),
      setDefaultMode: (defaultMode) => set({ defaultMode }),
      setCompactView: (compactView) => set({ compactView }),
      setShowAISuggestions: (showAISuggestions) => set({ showAISuggestions }),
      setLabTrendDays: (labTrendDays) => set({ labTrendDays }),
      setNotifyCriticalLabs: (notifyCriticalLabs) => set({ notifyCriticalLabs }),
      setNotifyTaskReminders: (notifyTaskReminders) => set({ notifyTaskReminders }),
      setNotifyHandoverAlerts: (notifyHandoverAlerts) => set({ notifyHandoverAlerts }),
    }),
    { name: 'medward-settings' }
  )
)
