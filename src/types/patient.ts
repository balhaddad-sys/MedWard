import type { Timestamp } from 'firebase/firestore'
import type { PatientState, PatientModification } from './patientState'

export interface Patient {
  id: string
  civilId: string
  mrn: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  nationality?: string
  bloodType?: string
  phone?: string
  emergencyContact?: string
  emergencyPhone?: string
  address?: string
  wardId: string // Legacy field - kept for backwards compatibility
  bedNumber: string
  admissionDate: Timestamp
  expectedDischarge?: Timestamp
  acuity: 1 | 2 | 3 | 4 | 5
  primaryDiagnosis: string
  diagnoses: string[]
  allergies: string[]
  codeStatus: 'full' | 'DNR' | 'DNI' | 'comfort'
  attendingPhysician: string
  team: string
  isolationPrecautions?: string[]
  weight?: number
  height?: number
  notes?: string
  createdBy: string // Legacy field - kept for backwards compatibility
  updatedAt: Timestamp
  createdAt: Timestamp

  // NEW: Patient state management (Phase 0)
  state: PatientState
  stateChangedAt: Timestamp
  stateChangedBy: string

  // NEW: Team-based access control (Phase 0)
  teamId: string
  assignedClinicians: string[] // User IDs with access to this patient

  // NEW: Audit trail (Phase 0)
  modificationHistory: PatientModification[]
  lastModifiedBy: string
}

export interface PatientFormData {
  civilId: string
  mrn: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  nationality?: string
  bloodType?: string
  phone?: string
  emergencyContact?: string
  emergencyPhone?: string
  address?: string
  wardId: string
  bedNumber: string
  acuity: 1 | 2 | 3 | 4 | 5
  primaryDiagnosis: string
  diagnoses: string[]
  allergies: string[]
  codeStatus: 'full' | 'DNR' | 'DNI' | 'comfort'
  attendingPhysician: string
  team: string
  isolationPrecautions?: string[]
  weight?: number
  height?: number
  notes?: string
}

export interface PatientSummary {
  id: string
  civilId: string
  mrn: string
  name: string
  bedNumber: string
  acuity: 1 | 2 | 3 | 4 | 5
  primaryDiagnosis: string
  pendingTasks: number
  criticalLabs: number
  lastUpdated: Timestamp
}
