/**
 * Offline Indicator (Phase 7)
 *
 * Network status banner showing online/offline state and pending actions
 */

import { WifiOff, Wifi, RefreshCw, AlertCircle } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineIndicator() {
  const { isOnline, isOffline, pendingCount, failedCount } = useNetworkStatus();

  // Don't show anything if online and no pending/failed actions
  if (isOnline && pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 shadow-lg border-b-2 ${
        isOffline
          ? 'bg-orange-500 border-orange-700 text-white'
          : failedCount > 0
          ? 'bg-yellow-500 border-yellow-700 text-gray-900'
          : 'bg-blue-500 border-blue-700 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Status Icon & Message */}
          <div className="flex items-center gap-3">
            {isOffline ? (
              <>
                <WifiOff className="w-5 h-5" />
                <span className="font-semibold text-sm">Offline Mode</span>
              </>
            ) : pendingCount > 0 ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="font-semibold text-sm">Syncing {pendingCount} change(s)...</span>
              </>
            ) : failedCount > 0 ? (
              <>
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold text-sm">{failedCount} sync failed</span>
              </>
            ) : (
              <>
                <Wifi className="w-5 h-5" />
                <span className="font-semibold text-sm">Back Online</span>
              </>
            )}
          </div>

          {/* Details */}
          <div className="text-sm opacity-90">
            {isOffline && pendingCount > 0 && (
              <span>{pendingCount} action(s) queued</span>
            )}
            {isOnline && failedCount > 0 && (
              <span>Please retry or contact support</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
