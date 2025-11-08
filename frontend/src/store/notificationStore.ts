import { create } from 'zustand';

export interface NotificationAuthor {
  id: string;
  email: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface NotificationWorkspace {
  id: string;
  name: string;
  type: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  category: string;
  inApp: boolean;
  desktop: boolean;
  sound: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  category: string;
  isRead: boolean;
  userId: string;
  workspaceId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  user: NotificationAuthor;
  workspace?: NotificationWorkspace | null;
  preferences?: NotificationPreference | null;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreference[];
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  
  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  setPreferences: (preferences: NotificationPreference[]) => void;
  updatePreference: (preference: NotificationPreference) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  preferences: [],
  isLoading: false,
  error: null,
  lastFetchTime: null,

  setNotifications: (notifications) => set({ 
    notifications,
    lastFetchTime: Date.now()
  }),

  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
  })),

  markAsRead: (notificationId) => set((state) => {
    const notifications = state.notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    const wasUnread = state.notifications.find(n => n.id === notificationId && !n.isRead);
    
    return {
      notifications,
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
    };
  }),

  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, isRead: true })),
    unreadCount: 0
  })),

  deleteNotification: (notificationId) => set((state) => {
    const notification = state.notifications.find(n => n.id === notificationId);
    const wasUnread = notification && !notification.isRead;
    
    return {
      notifications: state.notifications.filter(n => n.id !== notificationId),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
    };
  }),

  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),

  incrementUnreadCount: () => set((state) => ({ 
    unreadCount: state.unreadCount + 1 
  })),

  decrementUnreadCount: () => set((state) => ({ 
    unreadCount: Math.max(0, state.unreadCount - 1) 
  })),

  setPreferences: (preferences) => set({ preferences }),

  updatePreference: (preference) => set((state) => ({
    preferences: state.preferences.map(p => 
      p.category === preference.category ? preference : p
    )
  })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearNotifications: () => set({
    notifications: [],
    unreadCount: 0,
    error: null,
    lastFetchTime: null
  })
}));