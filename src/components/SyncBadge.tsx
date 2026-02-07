import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { offlineQueue } from '@/services/OfflineQueue'
import type { OfflineStatus } from '@/services/OfflineQueue'

export function SyncBadge() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: navigator.onLine,
    pendingCount: 0,
    failedCount: 0,
  })

  useEffect(() => {
    // Initialize the queue
    offlineQueue.init().catch(console.error)

    // Listen for status changes
    const unsubscribe = offlineQueue.onStatusChange(setStatus)

    // Also listen to native online/offline events as fallback
    const handleOnline = () =>
      setStatus((prev) => ({ ...prev, isOnline: true }))
    const handleOffline = () =>
      setStatus((prev) => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const isSyncing = status.isOnline && status.pendingCount > 0
  const isOffline = !status.isOnline

  return (
    <div
      className={clsx(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-colors',
        isOffline
          ? 'bg-red-100 text-red-700'
          : isSyncing
            ? 'bg-amber-100 text-amber-700'
            : 'bg-green-100 text-green-700'
      )}
      title={
        isOffline
          ? 'No internet connection'
          : isSyncing
            ? `Syncing ${status.pendingCount} pending writes`
            : 'All data synced'
      }
    >
      {isOffline ? (
        <WifiOff className="h-3 w-3" />
      ) : isSyncing ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Wifi className="h-3 w-3" />
      )}
      <span className="hidden sm:inline">
        {isOffline
          ? 'Offline'
          : isSyncing
            ? `Syncing (${status.pendingCount})`
            : 'Synced'}
      </span>
    </div>
  )
}
