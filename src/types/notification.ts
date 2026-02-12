/**
 * Notification System Types (Phase 0.2)
 *
 * Persistent notification model for closed-loop tasking,
 * alerts, and clinical event tracking
 */

import { Timestamp } from 'firebase/firestore';

export type NotificationType =
  | 'task_assigned'
  | 'task_overdue'
  | 'critical_lab'
  | 'escalation'
  | 'patient_deterioration'
  | 'info';

export type NotificationSeverity = 'critical' | 'high' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  userId: string; // Recipient
  createdAt: Timestamp;
  readAt?: Timestamp;
  actionUrl?: string; // Deep link to task/patient (e.g., /patients/123)
  metadata?: Record<string, unknown>; // Additional context (taskId, patientId, etc.)
}

export interface NotificationFormData {
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  userId: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}
