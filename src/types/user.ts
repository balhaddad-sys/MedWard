import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'physician' | 'nurse' | 'resident' | 'pharmacist' | 'admin'

export interface User {
  id: string
  email: string
  displayName: string
  role: UserRole
  department: string
  wardIds: string[]
  teamId?: string // NEW: Phase 0 team-based access
  preferences: UserPreferences
  createdAt: Timestamp
  lastLoginAt: Timestamp
}

export interface UserPreferences {
  defaultWard: string
  defaultMode: 'ward' | 'acute'
  notificationSettings: {
    criticalLabs: boolean
    taskReminders: boolean
    handoverAlerts: boolean
  }
  displaySettings: {
    compactView: boolean
    showAISuggestions: boolean
    labTrendDays: number
    labPriorityProfile?: 'ward' | 'icu' | 'cardiac'
  }
}

export interface AuthState {
  user: User | null
  firebaseUser: import('firebase/auth').User | null
  loading: boolean
  error: string | null
}
