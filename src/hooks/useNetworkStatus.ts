/**
 * useNetworkStatus Hook (Phase 7)
 *
 * Online/offline detection with automatic queue processing
 */

import { useState, useEffect } from 'react';
import { offlineQueue, type OfflineStatus } from '@/services/OfflineQueue';

export function useNetworkStatus() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: navigator.onLine,
    pendingCount: 0,
    failedCount: 0,
  });

  useEffect(() => {
    // Subscribe to offline queue status changes
    const unsubscribe = offlineQueue.onStatusChange(setStatus);

    // Initial status load
    offlineQueue.getStatus().then(setStatus);

    return unsubscribe;
  }, []);

  return {
    isOnline: status.isOnline,
    isOffline: !status.isOnline,
    pendingCount: status.pendingCount,
    failedCount: status.failedCount,
    hasPendingActions: status.pendingCount > 0,
    hasFailedActions: status.failedCount > 0,
  };
}
