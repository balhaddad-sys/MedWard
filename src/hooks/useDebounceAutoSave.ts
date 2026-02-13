import { useEffect, useRef, useState } from 'react'

interface UseDebounceAutoSaveReturn {
  isSaving: boolean
  lastSaved: Date | null
  error: string | null
}

/**
 * Hook for debounced auto-save functionality
 * Watches data for changes and automatically saves after a delay with no changes
 *
 * @param data - Data to watch for changes
 * @param saveFn - Async function to call when saving
 * @param delayMs - Delay in milliseconds before saving (default: 2000)
 */
export function useDebounceAutoSave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  delayMs: number = 2000
): UseDebounceAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastDataRef = useRef<T>(data)

  useEffect(() => {
    // Check if data actually changed
    if (JSON.stringify(lastDataRef.current) === JSON.stringify(data)) {
      return
    }

    lastDataRef.current = data

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for debounced save
    setError(null)

    timeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true)
        await saveFn(data)
        setLastSaved(new Date())
        setError(null)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to save'
        setError(errorMessage)
        console.error('Auto-save failed:', err)
      } finally {
        setIsSaving(false)
      }
    }, delayMs)

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, delayMs, saveFn])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    isSaving,
    lastSaved,
    error,
  }
}
