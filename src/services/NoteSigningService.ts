/**
 * Note Signing Service (Phase 8)
 *
 * Digital signatures for clinical notes with SHA-256 hashing
 * Amendment tracking with original signature preservation
 */

import { doc, updateDoc, getDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { ClerkingNote } from '@/types/clerking';
import type { NoteAmendment } from '@/types/auditLog';
import { AuditLogger } from './AuditLogger';

export class NoteSigningService {
  /**
   * Sign a clerking note with digital signature
   * Generates SHA-256 hash of note content for immutability
   */
  static async signNote(
    noteId: string,
    userId: string,
    userName: string
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      // 1. Get the note
      const noteRef = doc(db, 'clerking_notes', noteId);
      const noteSnap = await getDoc(noteRef);

      if (!noteSnap.exists()) {
        return { success: false, error: 'Note not found' };
      }

      const note = noteSnap.data() as ClerkingNote;

      // 2. Generate digital signature (SHA-256 hash of note content)
      const signature = await this.generateSignature(note);

      // 3. Update note with signature
      await updateDoc(noteRef, {
        status: 'signed',
        signedAt: serverTimestamp(),
        signedBy: userId,
        signedByName: userName,
        digitalSignature: signature,
        updatedAt: serverTimestamp(),
      });

      // 4. Log to audit trail
      await AuditLogger.logNoteSign(userId, userName, noteId, note.patientId, signature);

      console.log(`✅ Note signed: ${noteId} by ${userName}`);

      return { success: true, signature };
    } catch (error) {
      console.error('Failed to sign note:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign note',
      };
    }
  }

  /**
   * Amend a signed note (append-only, original preserved)
   */
  static async amendNote(params: {
    noteId: string;
    userId: string;
    userName: string;
    reason: string;
    changes: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Get the note
      const noteRef = doc(db, 'clerking_notes', params.noteId);
      const noteSnap = await getDoc(noteRef);

      if (!noteSnap.exists()) {
        return { success: false, error: 'Note not found' };
      }

      const note = noteSnap.data() as ClerkingNote & {
        amendments?: NoteAmendment[];
        digitalSignature?: string;
      };

      if (!note.digitalSignature) {
        return { success: false, error: 'Note must be signed before amending' };
      }

      // 2. Create amendment record
      const amendment: NoteAmendment = {
        id: `amendment_${Date.now()}`,
        originalNoteId: params.noteId,
        amendedBy: params.userId,
        amendedByName: params.userName,
        amendedAt: Timestamp.now(),
        reason: params.reason,
        changes: params.changes,
        originalSignature: note.digitalSignature, // Preserve original signature
      };

      // 3. Append amendment to note (original remains immutable)
      const amendments = note.amendments || [];
      await updateDoc(noteRef, {
        amendments: [...amendments, amendment],
        isAmended: true,
        lastAmendedAt: serverTimestamp(),
        lastAmendedBy: params.userId,
        updatedAt: serverTimestamp(),
      });

      // 4. Log to audit trail
      await AuditLogger.logNoteAmendment(
        params.userId,
        params.userName,
        params.noteId,
        note.patientId,
        params.reason,
        params.changes
      );

      console.log(`✅ Note amended: ${params.noteId} by ${params.userName}`);

      return { success: true };
    } catch (error) {
      console.error('Failed to amend note:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to amend note',
      };
    }
  }

  /**
   * Generate SHA-256 digital signature of note content
   * Creates immutable hash to detect tampering
   */
  private static async generateSignature(note: ClerkingNote): Promise<string> {
    // Create canonical string representation of note content
    const contentString = JSON.stringify({
      patientId: note.patientId,
      presentingComplaint: note.presentingComplaint,
      workingDiagnosis: note.workingDiagnosis,
      history: note.history,
      examination: note.examination,
      investigations: note.investigations,
      problemList: note.problemList,
      plan: note.plan,
      safety: note.safety,
      authorId: note.authorId,
      startedAt: note.startedAt,
    });

    // Generate SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(contentString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return `SHA256:${hashHex}`;
  }

  /**
   * Verify note signature (detect tampering)
   */
  static async verifySignature(
    note: ClerkingNote & { digitalSignature?: string }
  ): Promise<{ valid: boolean; reason?: string }> {
    if (!note.digitalSignature) {
      return { valid: false, reason: 'Note is not signed' };
    }

    try {
      const currentSignature = await this.generateSignature(note);

      if (currentSignature === note.digitalSignature) {
        return { valid: true };
      } else {
        return {
          valid: false,
          reason: 'Signature mismatch - note content may have been tampered with',
        };
      }
    } catch (error) {
      return {
        valid: false,
        reason: error instanceof Error ? error.message : 'Failed to verify signature',
      };
    }
  }
}
