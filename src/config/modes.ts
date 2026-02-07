export type ClinicalMode = 'ward' | 'acute' | 'clinic'

interface ModeFeatures {
  swipeActions: boolean
  timers: boolean
  detailedHistory: boolean
  autoLock?: boolean
  resultsFollowUp?: boolean
  taskEngine?: boolean
  calculators?: boolean
  protocolCards?: boolean
  escalation?: boolean
  smartScribe?: boolean
  trendDeck?: boolean
  patientEducation?: boolean
}

export interface ModeConfig {
  id: ClinicalMode
  label: string
  theme: string
  layout: 'list' | 'cockpit' | 'document'
  refreshRate: number
  haptics: 'light' | 'heavy' | 'medium'
  dataQuery: string
  features: ModeFeatures
}

export const MODES: Record<ClinicalMode, ModeConfig> = {
  ward: {
    id: 'ward',
    label: 'Ward Round',
    theme: 'theme-ward',
    layout: 'list',
    refreshRate: 60000,
    haptics: 'light',
    dataQuery: 'patients',
    features: {
      swipeActions: true,
      timers: false,
      detailedHistory: false,
      resultsFollowUp: true,
      taskEngine: true,
    },
  },
  acute: {
    id: 'acute',
    label: 'Acute / Resus',
    theme: 'theme-acute',
    layout: 'cockpit',
    refreshRate: 5000,
    haptics: 'heavy',
    dataQuery: 'patients/{id}/vitals',
    features: {
      swipeActions: false,
      timers: true,
      detailedHistory: false,
      autoLock: true,
      calculators: true,
      protocolCards: true,
      escalation: true,
    },
  },
  clinic: {
    id: 'clinic',
    label: 'Outpatient Clinic',
    theme: 'theme-clinic',
    layout: 'document',
    refreshRate: 0,
    haptics: 'medium',
    dataQuery: 'patients/{id}/history',
    features: {
      swipeActions: true,
      timers: false,
      detailedHistory: true,
      smartScribe: true,
      trendDeck: true,
      patientEducation: true,
    },
  },
} as const
