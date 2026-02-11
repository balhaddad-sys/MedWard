export type ClinicalMode = 'ward' | 'acute' | 'clinic'

export interface ModeConfig {
  id: ClinicalMode
  label: string
  theme: string
  refreshRate: number
}

export const MODES: Record<ClinicalMode, ModeConfig> = {
  ward: {
    id: 'ward',
    label: 'Ward Round',
    theme: 'theme-ward',
    refreshRate: 60000,
  },
  acute: {
    id: 'acute',
    label: 'On-Call',
    theme: 'theme-acute',
    refreshRate: 5000,
  },
  clinic: {
    id: 'clinic',
    label: 'Outpatient Clinic',
    theme: 'theme-clinic',
    refreshRate: 0,
  },
} as const
