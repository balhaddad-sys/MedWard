import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ClinicalMode } from '@/config/modes'
import type { UserPreferences } from '@/types'

export type LabPriorityProfile = 'ward' | 'icu' | 'cardiac'

const SETTINGS_STORAGE_VERSION = 2

const DEFAULT_SETTINGS = {
  defaultWard: '',
  defaultMode: 'ward' as ClinicalMode,
  compactView: false,
  showAISuggestions: true,
  labTrendDays: 7,
  labPriorityProfile: 'ward' as LabPriorityProfile,
  notifyCriticalLabs: true,
  notifyTaskReminders: true,
  notifyHandoverAlerts: true,
}

function isClinicalMode(value: unknown): value is ClinicalMode {
  return value === 'ward' || value === 'acute' || value === 'clerking'
}

function isLabPriorityProfile(value: unknown): value is LabPriorityProfile {
  return value === 'ward' || value === 'icu' || value === 'cardiac'
}

function clampLabTrendDays(value: number): number {
  return Math.min(30, Math.max(3, Math.round(value)))
}

function mapSettingsToPreferences(state: {
  defaultWard: string
  defaultMode: ClinicalMode
  compactView: boolean
  showAISuggestions: boolean
  labTrendDays: number
  labPriorityProfile: LabPriorityProfile
  notifyCriticalLabs: boolean
  notifyTaskReminders: boolean
  notifyHandoverAlerts: boolean
}): UserPreferences {
  return {
    defaultWard: state.defaultWard,
    defaultMode: state.defaultMode,
    notificationSettings: {
      criticalLabs: state.notifyCriticalLabs,
      taskReminders: state.notifyTaskReminders,
      handoverAlerts: state.notifyHandoverAlerts,
    },
    displaySettings: {
      compactView: state.compactView,
      showAISuggestions: state.showAISuggestions,
      labTrendDays: state.labTrendDays,
      labPriorityProfile: state.labPriorityProfile,
    },
  }
}

interface SettingsStore {
  defaultWard: string
  defaultMode: ClinicalMode
  compactView: boolean
  showAISuggestions: boolean
  labTrendDays: number
  labPriorityProfile: LabPriorityProfile
  notifyCriticalLabs: boolean
  notifyTaskReminders: boolean
  notifyHandoverAlerts: boolean
  setDefaultWard: (ward: string) => void
  setDefaultMode: (mode: ClinicalMode) => void
  setCompactView: (compact: boolean) => void
  setShowAISuggestions: (show: boolean) => void
  setLabTrendDays: (days: number) => void
  setLabPriorityProfile: (profile: LabPriorityProfile) => void
  setNotifyCriticalLabs: (notify: boolean) => void
  setNotifyTaskReminders: (notify: boolean) => void
  setNotifyHandoverAlerts: (notify: boolean) => void
  hydrateFromPreferences: (preferences: UserPreferences | null | undefined) => void
  toUserPreferences: () => UserPreferences
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      setDefaultWard: (defaultWard) => set({ defaultWard }),
      setDefaultMode: (defaultMode) => set({ defaultMode }),
      setCompactView: (compactView) => set({ compactView }),
      setShowAISuggestions: (showAISuggestions) => set({ showAISuggestions }),
      setLabTrendDays: (labTrendDays) => set({ labTrendDays: clampLabTrendDays(labTrendDays) }),
      setLabPriorityProfile: (labPriorityProfile) => set({ labPriorityProfile }),
      setNotifyCriticalLabs: (notifyCriticalLabs) => set({ notifyCriticalLabs }),
      setNotifyTaskReminders: (notifyTaskReminders) => set({ notifyTaskReminders }),
      setNotifyHandoverAlerts: (notifyHandoverAlerts) => set({ notifyHandoverAlerts }),
      hydrateFromPreferences: (preferences) => {
        if (!preferences) return
        set({
          defaultWard: preferences.defaultWard ?? DEFAULT_SETTINGS.defaultWard,
          defaultMode: isClinicalMode(preferences.defaultMode)
            ? preferences.defaultMode
            : DEFAULT_SETTINGS.defaultMode,
          compactView: preferences.displaySettings?.compactView ?? DEFAULT_SETTINGS.compactView,
          showAISuggestions: preferences.displaySettings?.showAISuggestions ?? DEFAULT_SETTINGS.showAISuggestions,
          labTrendDays: clampLabTrendDays(
            preferences.displaySettings?.labTrendDays ?? DEFAULT_SETTINGS.labTrendDays
          ),
          labPriorityProfile: isLabPriorityProfile(preferences.displaySettings?.labPriorityProfile)
            ? preferences.displaySettings.labPriorityProfile
            : DEFAULT_SETTINGS.labPriorityProfile,
          notifyCriticalLabs: preferences.notificationSettings?.criticalLabs ?? DEFAULT_SETTINGS.notifyCriticalLabs,
          notifyTaskReminders: preferences.notificationSettings?.taskReminders ?? DEFAULT_SETTINGS.notifyTaskReminders,
          notifyHandoverAlerts: preferences.notificationSettings?.handoverAlerts ?? DEFAULT_SETTINGS.notifyHandoverAlerts,
        })
      },
      toUserPreferences: () =>
        mapSettingsToPreferences({
          defaultWard: get().defaultWard,
          defaultMode: get().defaultMode,
          compactView: get().compactView,
          showAISuggestions: get().showAISuggestions,
          labTrendDays: get().labTrendDays,
          labPriorityProfile: get().labPriorityProfile,
          notifyCriticalLabs: get().notifyCriticalLabs,
          notifyTaskReminders: get().notifyTaskReminders,
          notifyHandoverAlerts: get().notifyHandoverAlerts,
        }),
    }),
    {
      name: 'medward-settings',
      version: SETTINGS_STORAGE_VERSION,
      partialize: (state) => ({
        defaultWard: state.defaultWard,
        defaultMode: state.defaultMode,
        compactView: state.compactView,
        showAISuggestions: state.showAISuggestions,
        labTrendDays: state.labTrendDays,
        labPriorityProfile: state.labPriorityProfile,
        notifyCriticalLabs: state.notifyCriticalLabs,
        notifyTaskReminders: state.notifyTaskReminders,
        notifyHandoverAlerts: state.notifyHandoverAlerts,
      }),
      migrate: (persistedState) => {
        const persisted = (persistedState as Partial<SettingsStore> | undefined) ?? {}

        return {
          ...DEFAULT_SETTINGS,
          defaultWard:
            typeof persisted.defaultWard === 'string'
              ? persisted.defaultWard
              : DEFAULT_SETTINGS.defaultWard,
          defaultMode: isClinicalMode(persisted.defaultMode)
            ? persisted.defaultMode
            : DEFAULT_SETTINGS.defaultMode,
          compactView:
            typeof persisted.compactView === 'boolean'
              ? persisted.compactView
              : DEFAULT_SETTINGS.compactView,
          showAISuggestions:
            typeof persisted.showAISuggestions === 'boolean'
              ? persisted.showAISuggestions
              : DEFAULT_SETTINGS.showAISuggestions,
          labTrendDays: clampLabTrendDays(
            typeof persisted.labTrendDays === 'number'
              ? persisted.labTrendDays
              : DEFAULT_SETTINGS.labTrendDays
          ),
          labPriorityProfile: isLabPriorityProfile(persisted.labPriorityProfile)
            ? persisted.labPriorityProfile
            : DEFAULT_SETTINGS.labPriorityProfile,
          notifyCriticalLabs:
            typeof persisted.notifyCriticalLabs === 'boolean'
              ? persisted.notifyCriticalLabs
              : DEFAULT_SETTINGS.notifyCriticalLabs,
          notifyTaskReminders:
            typeof persisted.notifyTaskReminders === 'boolean'
              ? persisted.notifyTaskReminders
              : DEFAULT_SETTINGS.notifyTaskReminders,
          notifyHandoverAlerts:
            typeof persisted.notifyHandoverAlerts === 'boolean'
              ? persisted.notifyHandoverAlerts
              : DEFAULT_SETTINGS.notifyHandoverAlerts,
        }
      },
    }
  )
)
