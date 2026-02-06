export const APP_NAME = 'MedWard Pro'
export const APP_VERSION = '1.0.0'

export const ACUITY_LEVELS = {
  1: { label: 'Critical', color: 'clinical-critical', description: 'Immediate attention required' },
  2: { label: 'Acute', color: 'clinical-high', description: 'Urgent care needed' },
  3: { label: 'Moderate', color: 'clinical-moderate', description: 'Standard monitoring' },
  4: { label: 'Stable', color: 'clinical-normal', description: 'Routine care' },
  5: { label: 'Discharge Ready', color: 'clinical-info', description: 'Awaiting discharge' },
} as const

export const TASK_PRIORITIES = {
  critical: { label: 'Critical', color: 'red', sortOrder: 0 },
  high: { label: 'High', color: 'orange', sortOrder: 1 },
  medium: { label: 'Medium', color: 'yellow', sortOrder: 2 },
  low: { label: 'Low', color: 'green', sortOrder: 3 },
} as const

export const TASK_STATUSES = {
  pending: { label: 'Pending', color: 'gray' },
  in_progress: { label: 'In Progress', color: 'blue' },
  completed: { label: 'Completed', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
} as const

export const LAB_CATEGORIES = {
  CBC: 'Complete Blood Count',
  BMP: 'Basic Metabolic Panel',
  CMP: 'Comprehensive Metabolic Panel',
  LFT: 'Liver Function Tests',
  COAG: 'Coagulation Studies',
  CARDIAC: 'Cardiac Markers',
  THYROID: 'Thyroid Function',
  UA: 'Urinalysis',
  ABG: 'Arterial Blood Gas',
  MISC: 'Miscellaneous',
} as const

export const WARD_MODES = {
  clinical: { label: 'Clinical Mode', description: 'Full patient management' },
  triage: { label: 'Lab Triage', description: 'Focus on lab results and critical values' },
  handover: { label: 'Handover Mode', description: 'Shift handover preparation' },
} as const

export const MAX_PATIENTS_PER_PAGE = 20
export const LAB_HISTORY_DAYS = 30
export const CRITICAL_VALUE_ALERT_TIMEOUT = 300000 // 5 minutes
