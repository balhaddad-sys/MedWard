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
      const entries = snapshot.docs.map((doc) => doc.data() as OnCallListEntry);
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
  notes?: string,
): Promise<void> {
  await addDoc(collection(db, ON_CALL_LIST_COLLECTION), {
    patientId,
    priority,
    isActive: true,
    addedBy: userId,
    addedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    escalationFlags: [],
    ...(notes ? { notes } : {}),
  });
}

/**
 * Remove an on-call list entry by ID
 */
export async function removeFromOnCallList(entryId: string): Promise<void> {
  await deleteDoc(doc(db, ON_CALL_LIST_COLLECTION, entryId));
}
