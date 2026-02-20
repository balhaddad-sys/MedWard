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
  deleteDoc,
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
 * Remove an on-call list entry by ID
 */
export async function removeFromOnCallList(entryId: string): Promise<void> {
  await deleteDoc(doc(db, ON_CALL_LIST_COLLECTION, entryId));
}
