/**
 * Notifications Firebase Service (Phase 0.2)
 *
 * CRUD operations for notifications collection
 * Real-time subscriptions for notification updates
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Notification, NotificationFormData } from '@/types/notification';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Create a new notification
 */
export async function createNotification(data: NotificationFormData): Promise<string> {
  const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
    readAt: serverTimestamp(),
  });
}

/**
 * Subscribe to real-time notifications for a user
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): Unsubscribe {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Notification)
      );
      callback(notifications);
    },
    (error) => {
      console.error('❌ Error in notifications subscription:', error);
      callback([]);
    }
  );
}

/**
 * Subscribe to unread notifications only
 */
export function subscribeToUnreadNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): Unsubscribe {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    where('readAt', '==', null),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Notification)
      );
      callback(notifications);
    },
    (error) => {
      console.error('❌ Error in unread notifications subscription:', error);
      callback([]);
    }
  );
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    where('readAt', '==', null)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}
