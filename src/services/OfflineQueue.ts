import { createTask } from '@/services/firebase/tasks'
import { createPatient, updatePatient } from '@/services/firebase/patients'
import { addLabPanel } from '@/services/firebase/labs'
import type { PatientFormData, TaskFormData, LabPanel } from '@/types'
import type { PatientState } from '@/types/patientState'

interface QueuedAction {
  id: string
  action: string
  payload: Record<string, unknown>
  createdAt: number
  retryCount: number
  status: 'pending' | 'processing' | 'failed'
}

const DB_NAME = 'medward_offline'
const STORE_NAME = 'write_queue'
const DB_VERSION = 1
const MAX_RETRIES = 10
// PHI minimization: queued items older than 24 h are purged on flush regardless of status
// In crisis mode this extends to 72 h
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000
const CRISIS_MAX_AGE_MS = 72 * 60 * 60 * 1000

class OfflineQueueService {
  private db: IDBDatabase | null = null
  private isOnline = navigator.onLine
  private isFlushing = false
  private crisisMode = false
  private listeners: Array<(status: OfflineStatus) => void> = []

  setCrisisMode(enabled: boolean): void {
    this.crisisMode = enabled
  }

  private get maxAgeMs(): number {
    return this.crisisMode ? CRISIS_MAX_AGE_MS : DEFAULT_MAX_AGE_MS
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        resolve()
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('status', 'status', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        this.setupConnectivityListeners()
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  private setupConnectivityListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.notifyListeners()
      this.flush()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.notifyListeners()
    })
  }

  async enqueue(action: string, payload: Record<string, unknown>): Promise<string> {
    const item: QueuedAction = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    }

    if (this.db) {
      await this.dbPut(item)
    }

    this.notifyListeners()

    // Try to flush immediately if online
    if (this.isOnline) {
      this.flush()
    }

    return item.id
  }

  async flush(): Promise<void> {
    if (this.isFlushing || !this.isOnline || !this.db) return
    this.isFlushing = true

    try {
      // Purge expired items first to limit PHI retention in IndexedDB
      await this.purgeExpired()

      const pendingItems = await this.getPendingItems()

      for (const item of pendingItems) {
        try {
          item.status = 'processing'
          await this.dbPut(item)

          await this.executeAction(item)

          // Success — remove from queue
          await this.dbDelete(item.id)
        } catch (error) {
          item.retryCount++
          if (item.retryCount >= MAX_RETRIES) {
            item.status = 'failed'
            console.error(`[OFFLINE] Action ${item.id} exceeded max retries:`, error)
          } else {
            item.status = 'pending'
          }
          await this.dbPut(item)
        }
      }
    } finally {
      this.isFlushing = false
      this.notifyListeners()
    }
  }

  private async executeAction(item: QueuedAction): Promise<void> {
    // Exponential backoff delay on retries
    if (item.retryCount > 0) {
      const delay = Math.min(1000 * Math.pow(2, item.retryCount), 30000)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    const { action, payload } = item

    switch (action) {
      case 'CREATE_PATIENT':
        await createPatient(
          payload.data as PatientFormData,
          payload.userId as string
        )
        break

      case 'UPDATE_PATIENT':
        await updatePatient(
          payload.id as string,
          payload.data as Partial<PatientFormData>
        )
        break

      case 'CREATE_TASK':
        await createTask(
          payload.data as TaskFormData,
          payload.userId as string,
          payload.userName as string
        )
        break

      case 'ADD_LAB':
        await addLabPanel(
          payload.patientId as string,
          payload.panel as Omit<LabPanel, 'id' | 'createdAt'>
        )
        break

      case 'TRANSITION_STATE':
        await updatePatient(
          payload.id as string,
          { state: payload.state as PatientState } as unknown as Partial<PatientFormData>
        )
        break

      case 'UPDATE_CIVIL_ID':
        await updatePatient(
          payload.id as string,
          { civilId: payload.civilId } as unknown as Partial<PatientFormData>
        )
        break

      default:
        throw new Error(`Unknown offline action: ${action}`)
    }
  }

  async getStatus(): Promise<OfflineStatus> {
    const pending = await this.getPendingItems()
    const failed = await this.getFailedItems()
    return {
      isOnline: this.isOnline,
      pendingCount: pending.length,
      failedCount: failed.length,
    }
  }

  onStatusChange(listener: (status: OfflineStatus) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private async notifyListeners(): Promise<void> {
    const status = await this.getStatus()
    this.listeners.forEach((l) => l(status))
  }

  private async getPendingItems(): Promise<QueuedAction[]> {
    if (!this.db) return []
    return this.dbGetByIndex('status', 'pending')
  }

  /** Remove all queued items older than MAX_AGE_MS regardless of status. */
  private async purgeExpired(): Promise<void> {
    if (!this.db) return
    const cutoff = Date.now() - this.maxAgeMs
    const all = await this.dbGetAll()
    await Promise.all(
      all
        .filter((item) => item.createdAt < cutoff)
        .map((item) => this.dbDelete(item.id)),
    )
  }

  /** Clear all queued items — call on logout to avoid leaving PHI in IndexedDB. */
  async clearAll(): Promise<void> {
    if (!this.db) return
    const all = await this.dbGetAll()
    await Promise.all(all.map((item) => this.dbDelete(item.id)))
    this.notifyListeners()
  }

  private async getFailedItems(): Promise<QueuedAction[]> {
    if (!this.db) return []
    return this.dbGetByIndex('status', 'failed')
  }

  private dbPut(item: QueuedAction): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'))
      const tx = this.db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(item)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private dbDelete(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'))
      const tx = this.db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private dbGetAll(): Promise<QueuedAction[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([])
      const tx = this.db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  private dbGetByIndex(indexName: string, value: string): Promise<QueuedAction[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([])
      const tx = this.db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index(indexName)
      const request = index.getAll(value)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }
}

export interface OfflineStatus {
  isOnline: boolean
  pendingCount: number
  failedCount: number
}

export const offlineQueue = new OfflineQueueService()
