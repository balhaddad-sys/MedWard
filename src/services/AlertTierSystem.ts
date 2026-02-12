/**
 * Alert Tier System (Phase 6)
 *
 * Manages tiered alerts with quiet hours and deduplication
 * Reduces alert fatigue while maintaining patient safety
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Alert, AlertTier, AlertCategory, AlertConfig } from '@/types/alert';
import { DEFAULT_ALERT_CONFIG } from '@/types/alert';

const ALERTS_COLLECTION = 'alerts';

export class AlertTierSystem {
  private static config: AlertConfig = DEFAULT_ALERT_CONFIG;

  /**
   * Update alert configuration
   */
  static setConfig(config: Partial<AlertConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Dispatch an alert with tier checking and deduplication
   */
  static async dispatchAlert(params: {
    tier: AlertTier;
    category: AlertCategory;
    title: string;
    message: string;
    patientId?: string;
    patientName?: string;
    bedNumber?: string;
    actionUrl?: string;
    dedupeKey: string;
    expiresInMinutes?: number;
    metadata?: Record<string, unknown>;
  }): Promise<{ sent: boolean; reason?: string; alertId?: string }> {
    // 1. Check quiet hours
    if (this.isQuietHours() && params.tier !== 'critical') {
      return {
        sent: false,
        reason: `Quiet hours active (${this.config.quietHoursStart}-${this.config.quietHoursEnd}). Only critical alerts allowed.`,
      };
    }

    // 2. Check for duplicate alerts within dedupe window
    const isDuplicate = await this.isDuplicateAlert(params.dedupeKey);
    if (isDuplicate) {
      return {
        sent: false,
        reason: `Duplicate alert suppressed (dedupe window: ${this.config.dedupeWindowMinutes} minutes)`,
      };
    }

    // 3. Create the alert
    const alert: Omit<Alert, 'id'> = {
      tier: params.tier,
      category: params.category,
      title: params.title,
      message: params.message,
      patientId: params.patientId,
      patientName: params.patientName,
      bedNumber: params.bedNumber,
      actionUrl: params.actionUrl,
      dedupeKey: params.dedupeKey,
      createdAt: Timestamp.now(),
      expiresAt: params.expiresInMinutes
        ? Timestamp.fromDate(new Date(Date.now() + params.expiresInMinutes * 60 * 1000))
        : undefined,
      metadata: params.metadata,
    };

    const docRef = await addDoc(collection(db, ALERTS_COLLECTION), alert);

    console.log(`✅ Alert dispatched: [${params.tier}] ${params.title}`);

    return {
      sent: true,
      alertId: docRef.id,
    };
  }

  /**
   * Check if currently within quiet hours
   */
  static isQuietHours(): boolean {
    if (!this.config.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const start = this.config.quietHoursStart;
    const end = this.config.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    // Handle same-day quiet hours (e.g., 13:00 to 14:00)
    return currentTime >= start && currentTime < end;
  }

  /**
   * Check if alert is duplicate within dedupe window
   */
  private static async isDuplicateAlert(dedupeKey: string): Promise<boolean> {
    const dedupeWindowStart = new Date(
      Date.now() - this.config.dedupeWindowMinutes * 60 * 1000
    );

    const q = query(
      collection(db, ALERTS_COLLECTION),
      where('dedupeKey', '==', dedupeKey),
      where('createdAt', '>', Timestamp.fromDate(dedupeWindowStart)),
      limit(1)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  /**
   * Dismiss an alert
   */
  static async dismissAlert(alertId: string, userId: string): Promise<void> {
    await updateDoc(doc(db, ALERTS_COLLECTION, alertId), {
      dismissedAt: serverTimestamp(),
      dismissedBy: userId,
    });
  }

  /**
   * Get active alerts for a user
   */
  static async getActiveAlerts(userId: string): Promise<Alert[]> {
    const now = Timestamp.now();

    const q = query(
      collection(db, ALERTS_COLLECTION),
      where('dismissedAt', '==', null),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Alert))
      .filter((alert) => {
        // Filter out expired alerts
        if (alert.expiresAt && alert.expiresAt.toMillis() < now.toMillis()) {
          return false;
        }
        return true;
      });
  }

  /**
   * Get critical alerts only
   */
  static async getCriticalAlerts(): Promise<Alert[]> {
    const q = query(
      collection(db, ALERTS_COLLECTION),
      where('tier', '==', 'critical'),
      where('dismissedAt', '==', null),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Alert));
  }

  /**
   * Dispatch common alert types (helper methods)
   */
  static async dispatchCriticalLabAlert(params: {
    patientId: string;
    patientName: string;
    bedNumber: string;
    labName: string;
    value: string;
    unit: string;
  }) {
    return this.dispatchAlert({
      tier: 'critical',
      category: 'critical-lab',
      title: `Critical Lab: ${params.labName}`,
      message: `${params.patientName} (${params.bedNumber}) - ${params.labName}: ${params.value}${params.unit}`,
      patientId: params.patientId,
      patientName: params.patientName,
      bedNumber: params.bedNumber,
      actionUrl: `/patients/${params.patientId}/labs`,
      dedupeKey: `critical-lab-${params.labName}-${params.patientId}`,
      expiresInMinutes: 120,
    });
  }

  static async dispatchTaskOverdueAlert(params: {
    patientId: string;
    patientName: string;
    bedNumber: string;
    taskTitle: string;
    taskId: string;
    hoursOverdue: number;
  }) {
    const tier: AlertTier = params.hoursOverdue > 4 ? 'critical' : 'high';

    return this.dispatchAlert({
      tier,
      category: 'task-overdue',
      title: `Task Overdue: ${params.taskTitle}`,
      message: `${params.patientName} (${params.bedNumber}) - ${params.taskTitle} is ${params.hoursOverdue}h overdue`,
      patientId: params.patientId,
      patientName: params.patientName,
      bedNumber: params.bedNumber,
      actionUrl: `/patients/${params.patientId}#tasks`,
      dedupeKey: `task-overdue-${params.taskId}`,
      expiresInMinutes: 60,
    });
  }

  static async dispatchPatientDeteriorationAlert(params: {
    patientId: string;
    patientName: string;
    bedNumber: string;
    reason: string;
  }) {
    return this.dispatchAlert({
      tier: 'critical',
      category: 'patient-deterioration',
      title: `Patient Deterioration: ${params.patientName}`,
      message: `${params.bedNumber} - ${params.reason}`,
      patientId: params.patientId,
      patientName: params.patientName,
      bedNumber: params.bedNumber,
      actionUrl: `/patients/${params.patientId}`,
      dedupeKey: `deterioration-${params.patientId}-${params.reason}`,
      expiresInMinutes: 240,
    });
  }
}
