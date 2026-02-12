/**
 * Notification Service (Phase 0.2)
 *
 * Centralized notification dispatch and management
 * Handles creating, reading, and acknowledging notifications
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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Notification, NotificationFormData } from '@/types/notification';

const NOTIFICATIONS_COLLECTION = 'notifications';

export class NotificationService {
  /**
   * Create a new notification
   */
  static async create(data: NotificationFormData): Promise<string> {
    const notification = {
      ...data,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notification);
    console.log('✅ Notification created:', docRef.id);
    return docRef.id;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, {
      readAt: serverTimestamp(),
    });
  }

  /**
   * Get unread notifications for a user
   */
  static async getUnreadForUser(userId: string): Promise<Notification[]> {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('readAt', '==', null),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Notification));
  }

  /**
   * Get all notifications for a user (read and unread)
   */
  static async getAllForUser(userId: string, limit: number = 50): Promise<Notification[]> {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .slice(0, limit)
      .map((doc) => ({ id: doc.id, ...doc.data() } as Notification));
  }

  /**
   * Get critical notifications for a user
   */
  static async getCriticalForUser(userId: string): Promise<Notification[]> {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('severity', '==', 'critical'),
      where('readAt', '==', null),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Notification));
  }
}
