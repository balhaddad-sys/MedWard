export type ClinicalMode = 'ward' | 'acute' | 'clinic'

// ---------------------------------------------------------------------------
// Feature flags — what each mode can do
// ---------------------------------------------------------------------------

export interface ModeFeatures {
  // Clinical capabilities
  spibar: boolean           // SBAR generation for handover
  taskEngine: boolean       // Task creation, assignment, tracking
  escalation: boolean       // NEWS2 / escalation protocols
  calculators: boolean      // Clinical scoring (NEWS2, CURB-65, Wells, CHA₂DS₂-VASc)
  timers: boolean           // IV timers, obs intervals, antibiotic countdowns
  trendDeck: boolean        // Lab trend sparklines & delta tracking
  resultsFollowUp: boolean  // Pending results tracker + auto-chase
  smartScribe: boolean      // AI clinic letter / discharge summary drafting
  patientEducation: boolean // Patient-facing info sheets

  // UI behaviour
  sortDefault: 'bed' | 'acuity' | 'appointment'
  notifyLevel: 'all' | 'urgent' | 'critical-only'
  compactView: boolean      // Triage-style compact cards
}

// ---------------------------------------------------------------------------
// Mode configuration
// ---------------------------------------------------------------------------

export interface ModeConfig {
  id: ClinicalMode
  label: string
  description: string
  theme: string
  refreshRate: number
  features: ModeFeatures
}

export const MODES: Record<ClinicalMode, ModeConfig> = {
  ward: {
    id: 'ward',
    label: 'Ward Round',
    description: 'Full patient management',
    theme: 'theme-ward',
    refreshRate: 60_000,
    features: {
      spibar: true,
      taskEngine: true,
      escalation: false,
      calculators: false,
      timers: false,
      trendDeck: true,
      resultsFollowUp: true,
      smartScribe: false,
      patientEducation: true,
      sortDefault: 'bed',
      notifyLevel: 'all',
      compactView: false,
    },
  },
  acute: {
    id: 'acute',
    label: 'On-Call',
    description: 'Acute care & escalation',
    theme: 'theme-acute',
    refreshRate: 5_000,
    features: {
      spibar: true,
      taskEngine: true,
      escalation: true,
      calculators: true,
      timers: true,
      trendDeck: false,
      resultsFollowUp: false,
      smartScribe: false,
      patientEducation: false,
      sortDefault: 'acuity',
      notifyLevel: 'critical-only',
      compactView: true,
    },
  },
  clinic: {
    id: 'clinic',
    label: 'Outpatient Clinic',
    description: 'Documentation & follow-up',
    theme: 'theme-clinic',
    refreshRate: 0,
    features: {
      spibar: false,
      taskEngine: false,
      escalation: false,
      calculators: false,
      timers: false,
      trendDeck: true,
      resultsFollowUp: true,
      smartScribe: true,
      patientEducation: true,
      sortDefault: 'appointment',
      notifyLevel: 'urgent',
      compactView: false,
    },
  },
} as const
