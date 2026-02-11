import type { Timestamp } from 'firebase/firestore'

/** Past Medical History entry */
export interface PMHEntry {
  condition: string
  status?: 'active' | 'resolved' | 'controlled'
  diagnosedYear?: string
  notes?: string
}

/** Past Surgical History entry */
export interface PSHEntry {
  procedure: string
  year?: string
  notes?: string
}

/** Medication entry */
export interface MedicationEntry {
  name: string
  dose?: string
  route?: string
  frequency?: string
  indication?: string
  status: 'active' | 'discontinued' | 'prn'
}

/** Family History entry */
export interface FamilyHistoryEntry {
  relation: string
  condition: string
  notes?: string
}

/** Social History */
export interface SocialHistory {
  smoking: string
  alcohol: string
  occupation: string
  livingSituation: string
  substances?: string
  exercise?: string
  diet?: string
}

/** Full patient history document */
export interface PatientHistory {
  patientId: string
  hpiText: string
  pmh: PMHEntry[]
  psh: PSHEntry[]
  medications: MedicationEntry[]
  familyHistory: FamilyHistoryEntry[]
  socialHistory: SocialHistory
  updatedAt: Timestamp
  updatedBy: string
}

/** Default empty history */
export const EMPTY_HISTORY: Omit<PatientHistory, 'patientId' | 'updatedAt' | 'updatedBy'> = {
  hpiText: '',
  pmh: [],
  psh: [],
  medications: [],
  familyHistory: [],
  socialHistory: {
    smoking: '',
    alcohol: '',
    occupation: '',
    livingSituation: '',
  },
}
