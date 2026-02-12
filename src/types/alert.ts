/**
 * Alert Types (Phase 6)
 *
 * Tiered alert system with quiet hours and deduplication
 * Designed to reduce alert fatigue while maintaining patient safety
 */

import type { Timestamp } from 'firebase/firestore';

export type AlertTier = 'critical' | 'high' | 'info';

export type AlertCategory =
  | 'patient-deterioration'
  | 'critical-lab'
  | 'task-overdue'
  | 'medication-due'
  | 'handover-due'
  | 'system'
  | 'other';

export interface Alert {
  id: string;
  tier: AlertTier;
  category: AlertCategory;
  title: string;
  message: string;
  patientId?: string;
  patientName?: string;
  bedNumber?: string;
  actionUrl?: string; // Where to navigate when clicked
  dedupeKey: string; // For deduplication (e.g., "critical-lab-K+-patient-123")
  createdAt: Timestamp;
  expiresAt?: Timestamp; // Auto-dismiss after this time
  dismissedAt?: Timestamp;
  dismissedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertConfig {
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format (e.g., "22:00")
  quietHoursEnd: string; // HH:MM format (e.g., "07:00")
  dedupeWindowMinutes: number; // Default: 60 minutes
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  dedupeWindowMinutes: 60,
};
