import { MODES } from '../config/modes'
import type { ClinicalMode } from '../config/modes'

interface Subscription {
  unsubscribe: () => void
}

let activeSubscription: Subscription | null = null
let pollingInterval: ReturnType<typeof setInterval> | null = null

export async function updateDataSubscriptions(
  mode: ClinicalMode,
  patientId?: string
): Promise<void> {
  // Tear down previous subscription
  if (activeSubscription) {
    activeSubscription.unsubscribe()
    activeSubscription = null
  }
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }

  const config = MODES[mode]

  switch (mode) {
    case 'ward':
      activeSubscription = subscribeToPatientList(config.refreshRate)
      break

    case 'acute':
      if (patientId) {
        activeSubscription = subscribeToVitals(patientId, config.refreshRate)
      }
      break

    case 'clinic':
      if (patientId) {
        await loadFullPatientHistory(patientId)
      }
      break
  }
}

function subscribeToPatientList(refreshRate: number): Subscription {
  // TODO: Replace with Firestore onSnapshot or polling
  // For now, set up polling placeholder
  console.log(`[DATA] Subscribed to patient list (refresh: ${refreshRate}ms)`)

  if (refreshRate > 0) {
    pollingInterval = setInterval(() => {
      // TODO: Re-fetch patient list
      console.log('[DATA] Polling patient list...')
    }, refreshRate)
  }

  return {
    unsubscribe: () => {
      console.log('[DATA] Unsubscribed from patient list')
      if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
      }
    },
  }
}

function subscribeToVitals(patientId: string, refreshRate: number): Subscription {
  // TODO: Implement real-time vitals subscription with Firestore
  console.log(`[DATA] Subscribed to vitals for ${patientId} (refresh: ${refreshRate}ms)`)

  if (refreshRate > 0) {
    pollingInterval = setInterval(() => {
      // TODO: Re-fetch vitals for patient
      console.log(`[DATA] Polling vitals for ${patientId}...`)
    }, refreshRate)
  }

  return {
    unsubscribe: () => {
      console.log('[DATA] Unsubscribed from vitals')
      if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
      }
    },
  }
}

async function loadFullPatientHistory(patientId: string): Promise<void> {
  // TODO: One-time fetch of full patient history from Firestore
  console.log(`[DATA] Loaded full history for ${patientId}`)
}

export function teardownSubscriptions(): void {
  if (activeSubscription) {
    activeSubscription.unsubscribe()
    activeSubscription = null
  }
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}
