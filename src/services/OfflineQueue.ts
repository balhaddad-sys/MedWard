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

class OfflineQueueService {
  private db: IDBDatabase | null = null
  private isOnline = navigator.onLine
  private isFlushing = false
  private listeners: Array<(status: OfflineStatus) => void> = []

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        console.warn('[OFFLINE] IndexedDB not available')
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
        console.error('[OFFLINE] Failed to open IndexedDB')
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
    // Exponential backoff delay
    if (item.retryCount > 0) {
      const delay = Math.min(1000 * Math.pow(2, item.retryCount), 30000)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    // TODO: Route to appropriate Firestore write based on action type
    // For now, log and succeed
    console.log(`[OFFLINE] Executing queued action: ${item.action}`, item.payload)

    // Example routing:
    // switch (item.action) {
    //   case 'CREATE_TASK': await createTask(item.payload); break;
    //   case 'UPDATE_PATIENT': await updatePatient(item.payload.id, item.payload); break;
    //   case 'ADD_LAB': await addLabPanel(item.payload.patientId, item.payload); break;
    // }
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
