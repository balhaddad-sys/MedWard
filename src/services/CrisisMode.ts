import { offlinePatientCache } from './OfflinePatientCache'
import { civilIdRegistry } from './CivilIdRegistry'
import { offlineQueue } from './OfflineQueue'

const CRISIS_KEY = 'medward_crisis_mode'

export interface CrisisReadinessReport {
  isActive: boolean
  cachedPatientCount: number
  cachedCivilIdCount: number
  pendingQueueItems: number
  serviceWorkerStatus: 'active' | 'installing' | 'waiting' | 'none'
  indexedDBAvailable: boolean
  lastSyncTime: number | null
}

class CrisisModeManager {
  private listeners: Array<(active: boolean) => void> = []

  isActive(): boolean {
    return localStorage.getItem(CRISIS_KEY) === 'true'
  }

  async activate(): Promise<void> {
    localStorage.setItem(CRISIS_KEY, 'true')
    this.notifyListeners()
  }

  async deactivate(): Promise<void> {
    localStorage.removeItem(CRISIS_KEY)
    this.notifyListeners()

    // Trigger full queue flush when going back to normal
    if (navigator.onLine) {
      offlineQueue.flush()
    }
  }

  async getReadinessReport(): Promise<CrisisReadinessReport> {
    const [patientStats, civilIdStats, queueStatus] = await Promise.all([
      offlinePatientCache.getStats(),
      civilIdRegistry.getCacheStats(),
      offlineQueue.getStatus(),
    ])

    let serviceWorkerStatus: CrisisReadinessReport['serviceWorkerStatus'] = 'none'
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg?.active) serviceWorkerStatus = 'active'
      else if (reg?.installing) serviceWorkerStatus = 'installing'
      else if (reg?.waiting) serviceWorkerStatus = 'waiting'
    }

    return {
      isActive: this.isActive(),
      cachedPatientCount: patientStats.patientCount,
      cachedCivilIdCount: civilIdStats.count,
      pendingQueueItems: queueStatus.pendingCount + queueStatus.failedCount,
      serviceWorkerStatus,
      indexedDBAvailable: 'indexedDB' in window,
      lastSyncTime: patientStats.lastCachedAt,
    }
  }

  onStatusChange(listener: (active: boolean) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notifyListeners(): void {
    const active = this.isActive()
    this.listeners.forEach((l) => l(active))
  }
}

export const crisisMode = new CrisisModeManager()
