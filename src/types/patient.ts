import type { Timestamp } from 'firebase/firestore'

export interface Patient {
  id: string
  mrn: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  wardId: string
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
  createdBy: string
  updatedAt: Timestamp
  createdAt: Timestamp
}

export interface PatientFormData {
  mrn: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
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
  mrn: string
  name: string
  bedNumber: string
  acuity: 1 | 2 | 3 | 4 | 5
  primaryDiagnosis: string
  pendingTasks: number
  criticalLabs: number
  lastUpdated: Timestamp
}
