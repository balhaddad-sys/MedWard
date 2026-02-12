/**
 * Audit Log Types (Phase 8)
 *
 * Immutable audit trail for medico-legal compliance
 * Tracks all patient, note, and task mutations
 */

import type { Timestamp } from 'firebase/firestore';

export type AuditAction =
  | 'patient.create'
  | 'patient.update'
  | 'patient.delete'
  | 'patient.access'
  | 'note.create'
  | 'note.update'
  | 'note.sign'
  | 'note.amend'
  | 'task.create'
  | 'task.update'
  | 'task.complete'
  | 'task.acknowledge'
  | 'lab.add'
  | 'lab.review'
  | 'medication.add'
  | 'medication.remove'
  | 'order-set.execute';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  userId: string;
  userName: string;
  timestamp: Timestamp;

  // Context
  patientId?: string;
  resourceType: 'patient' | 'note' | 'task' | 'lab' | 'medication' | 'order-set';
  resourceId: string;

  // Changes (for update actions)
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];

  // Metadata
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface NoteAmendment {
  id: string;
  originalNoteId: string;
  amendedBy: string;
  amendedByName: string;
  amendedAt: Timestamp;
  reason: string;
  changes: string; // Description of what was amended
  originalSignature: string; // Preserve original signature
}
