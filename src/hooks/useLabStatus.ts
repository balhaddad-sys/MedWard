import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/config/firebase'

interface LabStatusResult {
  status: string
  data: Record<string, unknown> | null
  error: string | null
}

export function useLabStatus(patientId: string | null, scanId: string | null): LabStatusResult {
  const [status, setStatus] = useState('uploading')
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId || !scanId) return

    const docRef = doc(db, 'patients', patientId, 'labs', scanId)

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const labData = snapshot.data()
          setStatus((labData.status as string) || 'unknown')
          setData(labData)
          if (labData.error) {
            setError(labData.error as string)
          }
        }
      },
      (err) => {
        console.error('[useLabStatus] Listener error:', err)
        setError(err.message)
        setStatus('error')
      }
    )

    return () => unsubscribe()
  }, [patientId, scanId])

  return { status, data, error }
}
