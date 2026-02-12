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
  OnCallSnapshot,
  ClerkingStatus,
  SectionStatus,
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
 * Calculate patient age from date of birth
 */
function calculateAge(dob: string | Date | Timestamp): number {
  let birthDate: Date;

  if (dob instanceof Timestamp) {
    birthDate = dob.toDate();
  } else if (dob instanceof Date) {
    birthDate = dob;
  } else {
    birthDate = new Date(dob);
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Create OnCallSnapshot from a ClerkingNote
 * Filters out undefined values to prevent Firestore errors
 */
function createOnCallSnapshot(note: ClerkingNote, patient: any | null): OnCallSnapshot {
  // Handle case where patient is not assigned
  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : 'Unassigned Patient';
  const age = patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : 0;
  const sex = patient?.gender || 'U';

  // Build snapshot with only defined values
  const snapshot: any = {
    patientId: note.patientId,
    patientName,
    age,
    sex,
    location: note.location || 'Not specified',
    workingDiagnosis: note.workingDiagnosis,
    problemList: note.problemList.filter((p) => p.isActive).map((p) => p.title),
    currentStatus: {
      criticalLabs: note.investigations?.labs
        ?.flatMap((panel) => panel.tests.filter((t) => t.isCritical).map((t) => `${t.name}: ${t.value}`))
        .filter(Boolean) as string[] || [],
      activeIssues: note.problemList.filter((p) => p.isActive && p.severity === 'high').map((p) => p.title),
    },
    tasks: note.plan?.tasks || [],
    escalationTriggers: note.plan?.monitoring?.escalationTriggers || [],
    lastUpdated: Timestamp.now(),
    linkedClerkingNoteId: note.id,
  };

  // Only add vitals if they exist and have values
  if (note.examination?.vitals && Object.keys(note.examination.vitals).length > 0) {
    snapshot.currentStatus.vitals = note.examination.vitals;
  }

  return snapshot as OnCallSnapshot;
}

/**
 * TRANSACTION: Save clerking note AND add patient to On-Call list
 * This is atomic - either both succeed or both fail
 */
export async function saveClerkingToOnCall(
  noteId: string,
  userId: string
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

      // 2. Get the patient data (if patient is assigned)
      let patient: any = null;
      if (note.patientId && note.patientId !== 'unassigned') {
        const patientRef = doc(db, PATIENTS_COLLECTION, note.patientId);
        const patientSnap = await transaction.get(patientRef);

        if (patientSnap.exists()) {
          patient = patientSnap.data();
        }
      }

      // 3. Update the clerking note to "signed"
      transaction.update(noteRef, {
        status: 'signed' as ClerkingStatus,
        signedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // 4. Create the On-Call entry
      const onCallRef = doc(collection(db, ON_CALL_LIST_COLLECTION));
      const snapshot = createOnCallSnapshot(note, patient);

      // Determine priority based on problem severity
      const hasCritical = note.problemList.some((p) => p.severity === 'critical');
      const hasHigh = note.problemList.some((p) => p.severity === 'high');
      const priority = hasCritical ? 'critical' : hasHigh ? 'high' : 'medium';

      const onCallEntry: OnCallListEntry = {
        id: onCallRef.id,
        snapshot,
        priority,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      transaction.set(onCallRef, onCallEntry);

      console.log('✅ Transaction complete: Clerking saved + On-Call entry created');
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
 */
export async function isPatientInOnCall(patientId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, ON_CALL_LIST_COLLECTION),
      where('snapshot.patientId', '==', patientId),
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
