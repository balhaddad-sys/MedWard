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
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { OnCallListEntry } from '@/types/clerking';

const ON_CALL_LIST_COLLECTION = 'on_call_list';

/**
 * Subscribe to active on-call list entries
 */
export function subscribeToOnCallList(
  callback: (entries: OnCallListEntry[]) => void
): Unsubscribe {
  const q = query(
    collection(db, ON_CALL_LIST_COLLECTION),
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
