import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/config/firebase'

export interface CivilIdRecord {
  civilId: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  nationality?: string
  bloodType?: string
  phone?: string
  emergencyContact?: string
  emergencyPhone?: string
  address?: string
  mrn?: string
  lastSeen: number
  source: 'firestore' | 'manual' | 'import'
}

const DB_NAME = 'medward_civil_id'
const STORE_NAME = 'registry'
const DB_VERSION = 1

class CivilIdRegistryService {
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
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'civilId' })
          store.createIndex('lastName', 'lastName', { unique: false })
          store.createIndex('phone', 'phone', { unique: false })
          store.createIndex('lastSeen', 'lastSeen', { unique: false })
        }
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  }

  async lookup(civilId: string): Promise<CivilIdRecord | null> {
    // Check local cache first (works offline)
    const local = await this.getLocal(civilId)
    if (local) return local

    // Try Firestore if online
    if (navigator.onLine) {
      try {
        const q = query(
          collection(db, 'patients'),
          where('civilId', '==', civilId)
        )
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data()
          const record: CivilIdRecord = {
            civilId,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            dateOfBirth: data.dateOfBirth || '',
            gender: data.gender || 'other',
            nationality: data.nationality,
            bloodType: data.bloodType,
            phone: data.phone,
            emergencyContact: data.emergencyContact,
            emergencyPhone: data.emergencyPhone,
            address: data.address,
            mrn: data.mrn,
            lastSeen: Date.now(),
            source: 'firestore',
          }
          await this.saveLocal(record)
          return record
        }
      } catch (error) {
        console.error('[CivilIdRegistry] Firestore lookup failed:', error)
      }
    }

    return null
  }

  async register(record: CivilIdRecord): Promise<void> {
    await this.saveLocal({ ...record, lastSeen: Date.now() })
  }

  async search(queryStr: string): Promise<CivilIdRecord[]> {
    const all = await this.getAllLocal()
    const q = queryStr.toLowerCase()
    return all.filter(
      (r) =>
        r.civilId.toLowerCase().includes(q) ||
        r.firstName.toLowerCase().includes(q) ||
        r.lastName.toLowerCase().includes(q) ||
        (r.phone && r.phone.includes(q))
    )
  }

  async bulkImport(records: CivilIdRecord[]): Promise<number> {
    let count = 0
    for (const record of records) {
      await this.saveLocal({ ...record, lastSeen: Date.now(), source: 'import' })
      count++
    }
    return count
  }

  async getCacheStats(): Promise<{ count: number; lastUpdated: number | null }> {
    const all = await this.getAllLocal()
    const lastUpdated = all.length > 0
      ? Math.max(...all.map((r) => r.lastSeen))
      : null
    return { count: all.length, lastUpdated }
  }

  async clearCache(): Promise<void> {
    if (!this.db) return
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private getLocal(civilId: string): Promise<CivilIdRecord | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(null)
      const tx = this.db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(civilId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  private saveLocal(record: CivilIdRecord): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve()
      const tx = this.db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(record)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private getAllLocal(): Promise<CivilIdRecord[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([])
      const tx = this.db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }
}

export const civilIdRegistry = new CivilIdRegistryService()
