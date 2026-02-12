/**
 * Notification Store (Phase 0.2)
 *
 * Zustand store for managing notifications state
 */

import { create } from 'zustand';
import type { Notification } from '@/types/notification';

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;

  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  clearAll: () => void;

  // Selectors
  getUnreadNotifications: () => Notification[];
  getCriticalNotifications: () => Notification[];
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.readAt).length,
    }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.readAt ? state.unreadCount : state.unreadCount + 1,
    })),

  markAsRead: (notificationId) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === notificationId && !n.readAt
          ? { ...n, readAt: new Date() as any }
          : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.readAt).length,
      };
    }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  getUnreadNotifications: () => {
    const state = get();
    return state.notifications.filter((n) => !n.readAt);
  },

  getCriticalNotifications: () => {
    const state = get();
    return state.notifications.filter((n) => n.severity === 'critical' && !n.readAt);
  },
}));
