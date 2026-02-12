/**
 * Clerking Notes Firebase Service
 * Handles CRUD operations and On-Call integration for structured clinical clerking
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  runTransaction,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type {
  ClerkingNote,
  OnCallListEntry,
  ClerkingStatus,
  _SectionStatus,
} from '@/types/clerking';

const CLERKING_NOTES_COLLECTION = 'clerking_notes';
const ON_CALL_LIST_COLLECTION = 'on_call_list';
const PATIENTS_COLLECTION = 'patients';

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create a new clerking note (draft)
 */
export async function createClerkingNote(
  userId: string,
  userName: string,
  patientId: string,
  initialData: Partial<ClerkingNote>
): Promise<string> {
  try {
    const noteRef = doc(collection(db, CLERKING_NOTES_COLLECTION));
    const now = Timestamp.now();

    const newNote: ClerkingNote = {
      id: noteRef.id,
      patientId,
      authorId: userId,
      authorName: userName,
      status: 'draft',
      startedAt: now,
      createdAt: now,
      updatedAt: now,
      location: initialData.location || '',
      workingDiagnosis: initialData.workingDiagnosis || '',
      diagnosisKeywords: initialData.diagnosisKeywords || [],
      presentingComplaint: initialData.presentingComplaint || '',
      history: initialData.history || {},
      examination: initialData.examination || {},
      investigations: initialData.investigations || {},
      problemList: initialData.problemList || [],
      plan: initialData.plan || {},
      safety: initialData.safety || {},
      sectionStatus: {
        history: 'incomplete',
        examination: 'incomplete',
        investigations: 'incomplete',
        assessment: 'incomplete',
        plan: 'incomplete',
        safety: 'incomplete',
      },
      completionPercentage: 0,
    };

    await setDoc(noteRef, newNote);
    console.log('✅ Clerking note created:', noteRef.id);
    return noteRef.id;
  } catch (error) {
    console.error('❌ Error creating clerking note:', error);
    throw new Error('Failed to create clerking note');
  }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single clerking note by ID
 */
export async function getClerkingNote(noteId: string): Promise<ClerkingNote | null> {
  try {
    const noteRef = doc(db, CLERKING_NOTES_COLLECTION, noteId);
    const noteSnap = await getDoc(noteRef);

    if (!noteSnap.exists()) {
      console.warn('⚠️ Clerking note not found:', noteId);
      return null;
    }

    return noteSnap.data() as ClerkingNote;
  } catch (error) {
    console.error('❌ Error fetching clerking note:', error);
    throw new Error('Failed to fetch clerking note');
  }
}

/**
 * Get all clerking notes for a patient
 */
export async function getClerkingNotesByPatient(
  patientId: string,
  limitCount: number = 10
): Promise<ClerkingNote[]> {
  try {
    const q = query(
      collection(db, CLERKING_NOTES_COLLECTION),
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as ClerkingNote);
  } catch (error) {
    console.error('❌ Error fetching patient clerking notes:', error);
    throw new Error('Failed to fetch patient clerking notes');
  }
}

/**
 * Get all clerking notes by author (current user)
 */
export async function getClerkingNotesByAuthor(
  authorId: string,
  limitCount: number = 20
): Promise<ClerkingNote[]> {
  try {
    const q = query(
      collection(db, CLERKING_NOTES_COLLECTION),
      where('authorId', '==', authorId),
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as ClerkingNote);
  } catch (error) {
    console.error('❌ Error fetching author clerking notes:', error);
    throw new Error('Failed to fetch author clerking notes');
  }
}

/**
 * Subscribe to real-time updates for a clerking note
 */
export function subscribeToClerkingNote(
  noteId: string,
  callback: (note: ClerkingNote | null) => void
): Unsubscribe {
  const noteRef = doc(db, CLERKING_NOTES_COLLECTION, noteId);

  return onSnapshot(
    noteRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as ClerkingNote);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('❌ Error in clerking note subscription:', error);
      callback(null);
    }
  );
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update a clerking note (auto-save)
 * Calculates completion percentage based on filled sections
 */
export async function updateClerkingNote(
  noteId: string,
  updates: Partial<ClerkingNote>
): Promise<void> {
  try {
    const noteRef = doc(db, CLERKING_NOTES_COLLECTION, noteId);

    // Always update timestamp and auto-save marker
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now(),
      lastAutoSaveAt: Timestamp.now(),
    };

    // Calculate completion percentage if section status is being updated
    if (updates.sectionStatus) {
      const completedSections = Object.values(updates.sectionStatus).filter(
        (status) => status === 'complete'
      ).length;
      const totalSections = Object.keys(updates.sectionStatus).length;
      updateData.completionPercentage = Math.round((completedSections / totalSections) * 100);
    }

    await updateDoc(noteRef, updateData);
    console.log('✅ Clerking note updated:', noteId);
  } catch (error) {
    console.error('❌ Error updating clerking note:', error);
    throw new Error('Failed to update clerking note');
  }
}

/**
 * Sign a clerking note (mark as complete)
 */
export async function signClerkingNote(noteId: string): Promise<void> {
  try {
    const noteRef = doc(db, CLERKING_NOTES_COLLECTION, noteId);

    await updateDoc(noteRef, {
      status: 'signed' as ClerkingStatus,
      signedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log('✅ Clerking note signed:', noteId);
  } catch (error) {
    console.error('❌ Error signing clerking note:', error);
    throw new Error('Failed to sign clerking note');
  }
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete a clerking note (soft delete by setting status)
 */
export async function deleteClerkingNote(noteId: string): Promise<void> {
  try {
    const noteRef = doc(db, CLERKING_NOTES_COLLECTION, noteId);
    await deleteDoc(noteRef);
    console.log('✅ Clerking note deleted:', noteId);
  } catch (error) {
    console.error('❌ Error deleting clerking note:', error);
    throw new Error('Failed to delete clerking note');
  }
}

// ============================================================================
// ON-CALL INTEGRATION (PREMIUM FEATURE)
// ============================================================================

/**
 * Extract escalation flags from clerking note
 * PHASE 0: Reference-only architecture - no more denormalized snapshots
 */
function extractEscalationFlags(note: ClerkingNote): string[] {
  const flags: string[] = [];

  // Critical labs
  const criticalLabs = note.investigations?.labs
    ?.flatMap((panel) => panel.tests.filter((t) => t.isCritical))
    .filter(Boolean);
  if (criticalLabs && criticalLabs.length > 0) {
    flags.push(`Critical labs: ${criticalLabs.length}`);
  }

  // High severity problems
  const criticalProblems = note.problemList.filter(
    (p) => p.isActive && (p.severity === 'critical' || p.severity === 'high')
  );
  if (criticalProblems.length > 0) {
    flags.push(`High-priority issues: ${criticalProblems.length}`);
  }

  // Escalation triggers
  if (note.plan?.monitoring?.escalationTriggers && note.plan.monitoring.escalationTriggers.length > 0) {
    flags.push(`Escalation triggers: ${note.plan.monitoring.escalationTriggers.length}`);
  }

  return flags;
}

/**
 * TRANSACTION: Save clerking note AND add patient to On-Call list
 * PHASE 0: Reference-only architecture - stores patientId only
 * This is atomic - either both succeed or both fail
 */
export async function saveClerkingToOnCall(
  noteId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; onCallId?: string; error?: string }> {
  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. Get the clerking note
      const noteRef = doc(db, CLERKING_NOTES_COLLECTION, noteId);
      const noteSnap = await transaction.get(noteRef);

      if (!noteSnap.exists()) {
        throw new Error('Clerking note not found');
      }

      const note = noteSnap.data() as ClerkingNote;
      if (!note.patientId || note.patientId === 'unassigned') {
        throw new Error('Please assign a patient before saving to On-Call');
      }

      // 2. Verify patient exists
      const patientRef = doc(db, PATIENTS_COLLECTION, note.patientId);
      const patientSnap = await transaction.get(patientRef);
      if (!patientSnap.exists()) {
        throw new Error('Assigned patient not found');
      }

      // 3. Update the clerking note to "signed"
      transaction.update(noteRef, {
        status: 'signed' as ClerkingStatus,
        signedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // 4. Create the On-Call entry (REFERENCE-ONLY)
      const onCallRef = doc(collection(db, ON_CALL_LIST_COLLECTION));

      // Determine priority based on problem severity
      const hasCritical = note.problemList.some((p) => p.severity === 'critical');
      const hasHigh = note.problemList.some((p) => p.severity === 'high');
      const priority = hasCritical ? 'critical' : hasHigh ? 'high' : 'medium';

      // Extract escalation flags from note
      const escalationFlags = extractEscalationFlags(note);

      const onCallEntry: OnCallListEntry = {
        id: onCallRef.id,
        patientId: note.patientId, // Reference only - no denormalized data
        priority,
        addedAt: Timestamp.now(),
        addedBy: userId,
        escalationFlags,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      transaction.set(onCallRef, onCallEntry);

      console.log('✅ Transaction complete: Clerking saved + On-Call entry created (reference-only)');
      return { success: true, onCallId: onCallRef.id };
    });

    return result;
  } catch (error) {
    console.error('❌ Transaction failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    };
  }
}

/**
 * Check if a patient is already in the On-Call list
 * PHASE 0: Updated to use reference-only architecture
 */
export async function isPatientInOnCall(patientId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, ON_CALL_LIST_COLLECTION),
      where('patientId', '==', patientId), // Reference-only field
      where('isActive', '==', true),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('❌ Error checking On-Call status:', error);
    return false;
  }
}

// ============================================================================
// SBAR / HANDOVER GENERATION
// ============================================================================

/**
 * Generate SBAR (Situation, Background, Assessment, Recommendation) handover text
 */
export function generateSBAR(note: ClerkingNote, patientName: string): string {
  const sections: string[] = [];

  // SITUATION
  sections.push('**SITUATION**');
  sections.push(`${patientName}, ${note.location}`);
  sections.push(`${note.presentingComplaint}`);
  sections.push('');

  // BACKGROUND
  sections.push('**BACKGROUND**');
  sections.push(`Diagnosis: ${note.workingDiagnosis}`);
  if (note.history?.pastMedicalHistory && note.history.pastMedicalHistory.length > 0) {
    sections.push(`PMH: ${note.history.pastMedicalHistory.join(', ')}`);
  }
  if (note.history?.medications && note.history.medications.length > 0) {
    sections.push(`Medications: ${note.history.medications.map((m) => m.name).join(', ')}`);
  }
  if (note.history?.allergies && note.history.allergies.length > 0) {
    sections.push(`Allergies: ${note.history.allergies.map((a) => a.substance).join(', ')}`);
  }
  sections.push('');

  // ASSESSMENT
  sections.push('**ASSESSMENT**');
  if (note.problemList.length > 0) {
    note.problemList.forEach((problem, index) => {
      sections.push(`${index + 1}. ${problem.title} (${problem.severity})`);
    });
  }
  if (note.examination?.vitals) {
    const v = note.examination.vitals;
    sections.push(
      `Vitals: HR ${v.heartRate}, BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}, ` +
        `RR ${v.respiratoryRate}, T ${v.temperature}, SpO2 ${v.oxygenSaturation}%`
    );
  }
  sections.push('');

  // RECOMMENDATION
  sections.push('**RECOMMENDATION**');
  if (note.plan?.monitoring) {
    sections.push(`Monitoring: ${note.plan.monitoring.vitalsFrequency}`);
  }
  if (note.plan?.tasks && note.plan.tasks.length > 0) {
    sections.push('Pending tasks:');
    note.plan.tasks.forEach((task) => {
      sections.push(`  - ${task.description}`);
    });
  }
  if (note.plan?.consults && note.plan.consults.length > 0) {
    sections.push('Consultations:');
    note.plan.consults.forEach((consult) => {
      sections.push(`  - ${consult.specialty}: ${consult.reason}`);
    });
  }

  return sections.join('\n');
}

/**
 * Save generated SBAR to the clerking note
 */
export async function saveHandoverText(
  noteId: string,
  handoverText: string,
  sbarText: string
): Promise<void> {
  try {
    await updateClerkingNote(noteId, {
      handoverText,
      sbarText,
    });
    console.log('✅ Handover text saved');
  } catch (error) {
    console.error('❌ Error saving handover text:', error);
    throw error;
  }
}
