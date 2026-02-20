/**
 * On-Call List Firebase Service
 * Fetch and manage patients in the on-call list
 */

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { OnCallListEntry } from '@/types/clerking';

const ON_CALL_LIST_COLLECTION = 'on_call_list';

export interface AddToOnCallListOptions {
  notes?: string;
  isTemporary?: boolean;
  temporaryPatientName?: string;
  temporaryWard?: string;
  temporaryBed?: string;
  temporaryCaseRef?: string;
}

/**
 * Subscribe to active on-call list entries for a specific user
 */
export function subscribeToOnCallList(
  userId: string,
  callback: (entries: OnCallListEntry[]) => void
): Unsubscribe {
  const q = query(
    collection(db, ON_CALL_LIST_COLLECTION),
    where('addedBy', '==', userId),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map((snap) => {
        const data = snap.data() as Partial<OnCallListEntry>;
        return {
          id: data.id || snap.id,
          patientId: data.patientId || '',
          priority: data.priority || 'medium',
          addedAt: data.addedAt || data.createdAt || new Date(),
          addedBy: data.addedBy || '',
          notes: data.notes,
          clerkingNoteId: data.clerkingNoteId,
          presentingComplaint: data.presentingComplaint,
          workingDiagnosis: data.workingDiagnosis,
          isTemporary: data.isTemporary,
          temporaryPatientName: data.temporaryPatientName,
          temporaryWard: data.temporaryWard,
          temporaryBed: data.temporaryBed,
          temporaryCaseRef: data.temporaryCaseRef,
          escalationFlags: data.escalationFlags || [],
          lastReviewedAt: data.lastReviewedAt,
          isActive: data.isActive ?? true,
          createdAt: data.createdAt || data.addedAt || new Date(),
          updatedAt: data.updatedAt || data.createdAt || data.addedAt || new Date(),
        } as OnCallListEntry;
      });
      callback(entries);
    },
    (error) => {
      console.error('❌ Error in on-call list subscription:', error);
      callback([]);
    }
  );
}

/**
 * Add a patient to the on-call list
 */
export async function addToOnCallList(
  userId: string,
  patientId: string,
  priority: 'low' | 'medium' | 'high' | 'critical',
  options?: AddToOnCallListOptions,
): Promise<void> {
  const notes = options?.notes?.trim();
  const temporaryPatientName = options?.temporaryPatientName?.trim();
  const temporaryWard = options?.temporaryWard?.trim();
  const temporaryBed = options?.temporaryBed?.trim();
  const temporaryCaseRef = options?.temporaryCaseRef?.trim();

  await addDoc(collection(db, ON_CALL_LIST_COLLECTION), {
    patientId,
    priority,
    isActive: true,
    addedBy: userId,
    addedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    escalationFlags: [],
    ...(notes ? { notes } : {}),
    ...(options?.isTemporary ? { isTemporary: true } : {}),
    ...(temporaryPatientName ? { temporaryPatientName } : {}),
    ...(temporaryWard ? { temporaryWard } : {}),
    ...(temporaryBed ? { temporaryBed } : {}),
    ...(temporaryCaseRef ? { temporaryCaseRef } : {}),
  });
}

/**
 * Remove an on-call list entry by ID
 */
export async function removeFromOnCallList(entryId: string): Promise<void> {
  await deleteDoc(doc(db, ON_CALL_LIST_COLLECTION, entryId));
}
