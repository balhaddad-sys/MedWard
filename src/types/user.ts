import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'physician' | 'nurse' | 'resident' | 'pharmacist' | 'admin'

export interface User {
  id: string
  email: string
  displayName: string
  role: UserRole
  department: string
  wardIds: string[]
  preferences: UserPreferences
  createdAt: Timestamp
  lastLoginAt: Timestamp
}

export interface UserPreferences {
  defaultWard: string
  defaultMode: 'clinical' | 'triage' | 'handover'
  notificationSettings: {
    criticalLabs: boolean
    taskReminders: boolean
    handoverAlerts: boolean
  }
  displaySettings: {
    compactView: boolean
    showAISuggestions: boolean
    labTrendDays: number
  }
}

export interface AuthState {
  user: User | null
  firebaseUser: import('firebase/auth').User | null
  loading: boolean
  error: string | null
}
