import { create } from 'zustand';
import api from '../services/api';

export interface Notification {
  id: string;
  recipient_id: string;
  actor_name: string;
  verb: string;
  task_id: string;
  task_key: string;
  task_title: string;
  created_at: string;
  is_read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'is_read'> & { is_read?: boolean }) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('auth/notifications/');
      const notifications = response.data;
      const unreadCount = notifications.filter((n: Notification) => !n.is_read).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addNotification: (notification) => {
    const newNotification: Notification = { ...notification, is_read: !!notification.is_read };
    set((state) => {
      // Prevent duplicates
      if (state.notifications.some((n) => n.id === newNotification.id)) return state;
      
      const updatedNotifications = [newNotification, ...state.notifications];
      const unreadCount = updatedNotifications.filter((n) => !n.is_read).length;
      return {
        notifications: updatedNotifications,
        unreadCount
      };
    });
  },

  markAsRead: async (id) => {
    try {
      await api.patch(`auth/notifications/${id}/read/`);
      set((state) => {
        const updated = state.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n);
        const unreadCount = updated.filter((n) => !n.is_read).length;
        return {
          notifications: updated,
          unreadCount
        };
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      await api.post('auth/notifications/mark-all-read/');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0
      }));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }
}));
