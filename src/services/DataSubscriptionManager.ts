import { MODES } from '../config/modes'
import type { ClinicalMode } from '../config/modes'
import { subscribeToAllPatients } from './firebase/patients'
import { subscribeToLabs } from './firebase/labs'
import type { Unsubscribe } from 'firebase/firestore'

interface Subscription {
  unsubscribe: () => void
}

let activeSubscriptions: Subscription[] = []
let pollingInterval: ReturnType<typeof setInterval> | null = null

export async function updateDataSubscriptions(
  mode: ClinicalMode,
  userId: string,
  patientId?: string
): Promise<void> {
  // Tear down previous subscriptions
  teardownSubscriptions()

  switch (mode) {
    case 'ward':
      activeSubscriptions.push(subscribeToPatientList(userId))
      break

    case 'acute':
      if (patientId) {
        activeSubscriptions.push(subscribeToVitals(patientId, MODES[mode].refreshRate))
      }
      break

    case 'clerking':
      if (patientId) {
        activeSubscriptions.push(subscribeToPatientHistory(patientId))
      }
      break
  }
}

function subscribeToPatientList(userId: string): Subscription {
  // Real-time Firestore subscription for ward patient list
  const unsubscribe: Unsubscribe = subscribeToAllPatients(userId, () => {
    // Patient data flows through App.tsx DataSubscriptions -> Zustand store
  })

  return { unsubscribe }
}

function subscribeToVitals(patientId: string, refreshRate: number): Subscription {
  // Subscribe to patient labs as the closest vitals proxy available
  const unsubscribe: Unsubscribe = subscribeToLabs(patientId, () => {
    // Lab data flows through Zustand store
  })

  // Keep a polling interval for future real-time vitals integration
  if (refreshRate > 0) {
    pollingInterval = setInterval(() => {
      // Firestore onSnapshot handles real-time updates; polling reserved for future APIs
    }, refreshRate)
  }

  return {
    unsubscribe: () => {
      unsubscribe()
      if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
      }
    },
  }
}

function subscribeToPatientHistory(patientId: string): Subscription {
  // Subscribe to full lab history for clerking trend view
  const unsubscribe: Unsubscribe = subscribeToLabs(patientId, () => {
    // Lab data flows through Zustand store
  })

  return { unsubscribe }
}

export function teardownSubscriptions(): void {
  for (const sub of activeSubscriptions) {
    sub.unsubscribe()
  }
  activeSubscriptions = []
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}
