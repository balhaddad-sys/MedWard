import type { Patient } from '@/types'
import type { LabPanel } from '@/types/lab'

const DB_NAME = 'medward_patient_cache'
const DB_VERSION = 1
const STORES = {
  patients: 'patients',
  tasks: 'tasks',
  labs: 'labs',
} as const

// PHI auto-purge: records older than 72 hours
const MAX_AGE_MS = 72 * 60 * 60 * 1000

class OfflinePatientCacheService {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        resolve()
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        for (const storeName of Object.values(STORES)) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' })
          }
        }
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  }

  async syncFromStore(patients: Patient[]): Promise<void> {
    if (!this.db) return
    const tx = this.db.transaction(STORES.patients, 'readwrite')
    const store = tx.objectStore(STORES.patients)

    // Clear and re-write all patients
    await this.promisify(store.clear())
    for (const patient of patients) {
      store.put({ ...this.serializePatient(patient), _cachedAt: Date.now() })
    }
  }

  async getPatients(): Promise<Patient[]> {
    if (!this.db) return []
    const all = await this.getAllFromStore<Patient & { _cachedAt: number }>(STORES.patients)
    const cutoff = Date.now() - MAX_AGE_MS
    return all.filter((p) => p._cachedAt > cutoff)
  }

  async getPatient(id: string): Promise<Patient | null> {
    if (!this.db) return null
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.patients, 'readonly')
      const store = tx.objectStore(STORES.patients)
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async syncLabs(patientId: string, panels: LabPanel[]): Promise<void> {
    if (!this.db) return
    const tx = this.db.transaction(STORES.labs, 'readwrite')
    const store = tx.objectStore(STORES.labs)
    store.put({ id: patientId, panels, _cachedAt: Date.now() })
  }

  async getLabsForPatient(patientId: string): Promise<LabPanel[]> {
    if (!this.db) return []
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.labs, 'readonly')
      const store = tx.objectStore(STORES.labs)
      const request = store.get(patientId)
      request.onsuccess = () => resolve(request.result?.panels || [])
      request.onerror = () => reject(request.error)
    })
  }

  async clearAll(): Promise<void> {
    if (!this.db) return
    for (const storeName of Object.values(STORES)) {
      const tx = this.db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).clear()
    }
  }

  async purgeExpired(): Promise<void> {
    if (!this.db) return
    const cutoff = Date.now() - MAX_AGE_MS
    for (const storeName of Object.values(STORES)) {
      const all = await this.getAllFromStore<{ id: string; _cachedAt: number }>(storeName)
      const tx = this.db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      for (const item of all) {
        if (item._cachedAt < cutoff) {
          store.delete(item.id)
        }
      }
    }
  }

  async getStats(): Promise<{ patientCount: number; lastCachedAt: number | null }> {
    const patients = await this.getAllFromStore<{ _cachedAt: number }>(STORES.patients)
    return {
      patientCount: patients.length,
      lastCachedAt: patients.length > 0
        ? Math.max(...patients.map((p) => p._cachedAt))
        : null,
    }
  }

  private serializePatient(patient: Patient): Record<string, unknown> {
    // Convert Firestore Timestamps to plain objects for IndexedDB storage
    const plain: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(patient)) {
      if (value && typeof value === 'object' && 'toMillis' in value) {
        plain[key] = { seconds: value.seconds, nanoseconds: value.nanoseconds }
      } else {
        plain[key] = value
      }
    }
    return plain
  }

  private getAllFromStore<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([])
      const tx = this.db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  private promisify(request: IDBRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

export const offlinePatientCache = new OfflinePatientCacheService()
