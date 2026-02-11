export type { Patient, PatientFormData, PatientSummary } from './patient'
export type { LabPanel, LabValue, LabFlag, LabCategory, LabAIAnalysis, LabTrend, LabUploadResult, CriticalValue, ExtractedPatientInfo, ExtractedLabResult, ExtractedLabPanel, ExtractionResponse, ExtractedTrend, ExtractedTrendDirection } from './lab'
export type { Task, TaskFormData, TaskPriority, TaskStatus, TaskCategory } from './task'
export type { User, UserRole, UserPreferences, AuthState } from './user'
export type { PatientHistory, PMHEntry, PSHEntry, MedicationEntry, FamilyHistoryEntry, SocialHistory } from './history'
export { EMPTY_HISTORY } from './history'

export interface Ward {
  id: string
  name: string
  floor: string
  department: string
  capacity: number
  currentCensus: number
}

export interface HandoverReport {
  id: string
  wardId: string
  generatedBy: string
  generatedAt: import('firebase/firestore').Timestamp
  patients: HandoverPatient[]
  summary: string
}

export interface HandoverPatient {
  patientId: string
  name: string
  bedNumber: string
  acuity: 1 | 2 | 3 | 4 | 5
  oneLiner: string
  activeIssues: string[]
  pendingTasks: string[]
  anticipatedIssues: string[]
  criticalLabs: string[]
}

export interface SBARReport {
  situation: string
  background: string
  assessment: string
  recommendation: string
  patientId: string
  generatedAt: import('firebase/firestore').Timestamp
}

export type WardMode = 'ward' | 'acute' | 'clinic'
