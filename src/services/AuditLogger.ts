/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Audit Logger (Phase 8)
 *
 * Records all clinical data mutations to immutable audit log
 * Ensures medico-legal compliance and traceability
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { AuditAction, AuditLogEntry } from '@/types/auditLog';

const AUDIT_LOG_COLLECTION = 'auditLog';

export class AuditLogger {
  private static sessionId: string = this.generateSessionId();

  /**
   * Log an action to the audit trail
   */
  static async log(params: {
    action: AuditAction;
    userId: string;
    userName: string;
    resourceType: 'patient' | 'note' | 'task' | 'lab' | 'medication' | 'order-set';
    resourceId: string;
    patientId?: string;
    changes?: { field: string; oldValue: unknown; newValue: unknown }[];
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const entry: Omit<AuditLogEntry, 'id'> = {
      action: params.action,
      userId: params.userId,
      userName: params.userName,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      patientId: params.patientId,
      changes: params.changes,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      metadata: params.metadata,
      timestamp: serverTimestamp() as any,
    };

    try {
      const docRef = await addDoc(collection(db, AUDIT_LOG_COLLECTION), entry);
      console.log(`📝 Audit log: ${params.action} - ${params.resourceType}/${params.resourceId}`);
      return docRef.id;
    } catch (error) {
      console.error('Failed to write audit log:', error);
      throw error;
    }
  }

  /**
   * Log patient access (read)
   */
  static async logPatientAccess(
    userId: string,
    userName: string,
    patientId: string
  ): Promise<void> {
    await this.log({
      action: 'patient.access',
      userId,
      userName,
      resourceType: 'patient',
      resourceId: patientId,
      patientId,
    });
  }

  /**
   * Log patient creation
   */
  static async logPatientCreate(
    userId: string,
    userName: string,
    patientId: string,
    patientData: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      action: 'patient.create',
      userId,
      userName,
      resourceType: 'patient',
      resourceId: patientId,
      patientId,
      metadata: { patientData },
    });
  }

  /**
   * Log patient update
   */
  static async logPatientUpdate(
    userId: string,
    userName: string,
    patientId: string,
    changes: { field: string; oldValue: unknown; newValue: unknown }[]
  ): Promise<void> {
    await this.log({
      action: 'patient.update',
      userId,
      userName,
      resourceType: 'patient',
      resourceId: patientId,
      patientId,
      changes,
    });
  }

  /**
   * Log note signing
   */
  static async logNoteSign(
    userId: string,
    userName: string,
    noteId: string,
    patientId: string,
    signature: string
  ): Promise<void> {
    await this.log({
      action: 'note.sign',
      userId,
      userName,
      resourceType: 'note',
      resourceId: noteId,
      patientId,
      metadata: { digitalSignature: signature },
    });
  }

  /**
   * Log note amendment
   */
  static async logNoteAmendment(
    userId: string,
    userName: string,
    noteId: string,
    patientId: string,
    reason: string,
    changes: string
  ): Promise<void> {
    await this.log({
      action: 'note.amend',
      userId,
      userName,
      resourceType: 'note',
      resourceId: noteId,
      patientId,
      metadata: { reason, changes },
    });
  }

  /**
   * Log task completion
   */
  static async logTaskComplete(
    userId: string,
    userName: string,
    taskId: string,
    patientId: string,
    completionProof?: { type: string; content: string }
  ): Promise<void> {
    await this.log({
      action: 'task.complete',
      userId,
      userName,
      resourceType: 'task',
      resourceId: taskId,
      patientId,
      metadata: { completionProof },
    });
  }

  /**
   * Log order set execution
   */
  static async logOrderSetExecute(
    userId: string,
    userName: string,
    orderSetId: string,
    patientId: string,
    tasksCreated: number
  ): Promise<void> {
    await this.log({
      action: 'order-set.execute',
      userId,
      userName,
      resourceType: 'order-set',
      resourceId: orderSetId,
      patientId,
      metadata: { tasksCreated },
    });
  }

  /**
   * Log lab review
   */
  static async logLabReview(
    userId: string,
    userName: string,
    labId: string,
    patientId: string
  ): Promise<void> {
    await this.log({
      action: 'lab.review',
      userId,
      userName,
      resourceType: 'lab',
      resourceId: labId,
      patientId,
    });
  }

  /**
   * Generate session ID (unique per browser session)
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
