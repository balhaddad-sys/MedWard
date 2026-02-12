/**
 * useAlertMonitor Hook (Phase 6)
 *
 * Real-time alert detection and monitoring
 * Subscribes to active alerts and provides dismissal functionality
 */

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { AlertTierSystem } from '@/services/AlertTierSystem';
import type { Alert } from '@/types/alert';

export function useAlertMonitor(userId?: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let unsubscribe: Unsubscribe;

    // Subscribe to active alerts
    const q = query(
      collection(db, 'alerts'),
      where('dismissedAt', '==', null),
      orderBy('createdAt', 'desc')
    );

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const now = Timestamp.now();
        const fetchedAlerts = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Alert))
          .filter((alert) => {
            // Filter out expired alerts
            if (alert.expiresAt && alert.expiresAt.toMillis() < now.toMillis()) {
              return false;
            }
            return true;
          });

        setAlerts(fetchedAlerts);
        setCriticalAlerts(fetchedAlerts.filter((a) => a.tier === 'critical'));
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error in alert subscription:', error);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  const dismissAlert = async (alertId: string) => {
    if (!userId) return;

    try {
      await AlertTierSystem.dismissAlert(alertId, userId);
      // Local state will be updated by the onSnapshot listener
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const dismissAll = async () => {
    if (!userId) return;

    try {
      await Promise.all(alerts.map((alert) => AlertTierSystem.dismissAlert(alert.id, userId)));
    } catch (error) {
      console.error('Failed to dismiss all alerts:', error);
    }
  };

  return {
    alerts,
    criticalAlerts,
    loading,
    dismissAlert,
    dismissAll,
    hasAlerts: alerts.length > 0,
    hasCriticalAlerts: criticalAlerts.length > 0,
    alertCount: alerts.length,
    criticalAlertCount: criticalAlerts.length,
  };
}
