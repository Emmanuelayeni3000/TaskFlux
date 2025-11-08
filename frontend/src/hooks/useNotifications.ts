import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import type { Notification, NotificationPreference } from '../store/notificationStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface FetchNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  workspaceId?: string;
  category?: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
}

export const useNotifications = () => {
  const { token, isAuthenticated } = useAuthStore();
  const {
    notifications,
    unreadCount,
    preferences,
    isLoading,
    error,
    setNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    setUnreadCount,
    setPreferences,
    updatePreference,
    setLoading,
    setError,
    clearNotifications
  } = useNotificationStore();

  const fetchNotifications = useCallback(async (options: FetchNotificationsOptions = {}) => {
    if (!token || !isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (options.page) queryParams.append('page', options.page.toString());
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.unreadOnly) queryParams.append('unreadOnly', 'true');
      if (options.workspaceId) queryParams.append('workspaceId', options.workspaceId);
      if (options.category) queryParams.append('category', options.category);

      const response = await fetch(`${API_BASE_URL}/notifications?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data: NotificationsResponse = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated, setNotifications, setUnreadCount, setLoading, setError]);

  const fetchUnreadCount = useCallback(async (workspaceId?: string) => {
    if (!token || !isAuthenticated) return;

    try {
      const queryParams = new URLSearchParams();
      if (workspaceId) queryParams.append('workspaceId', workspaceId);

      const response = await fetch(`${API_BASE_URL}/notifications/unread-count?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch unread count');
      }

      const data = await response.json();
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [token, isAuthenticated, setUnreadCount]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    if (!token || !isAuthenticated) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      markAsRead(notificationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
    }
  }, [token, isAuthenticated, markAsRead, setError]);

  const markAllNotificationsAsRead = useCallback(async (workspaceId?: string) => {
    if (!token || !isAuthenticated) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workspaceId })
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      markAllAsRead();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
    }
  }, [token, isAuthenticated, markAllAsRead, setError]);

  const deleteNotificationById = useCallback(async (notificationId: string) => {
    if (!token || !isAuthenticated) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      deleteNotification(notificationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
    }
  }, [token, isAuthenticated, deleteNotification, setError]);

  const createTestNotification = useCallback(async (params: {
    title: string;
    message: string;
    type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    category: string;
    workspaceId?: string;
  }) => {
    if (!token || !isAuthenticated) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error('Failed to create test notification');
      }

      const data = await response.json();
      return data.notification;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create test notification');
    }
  }, [token, isAuthenticated, setError]);

  const fetchPreferences = useCallback(async () => {
    if (!token || !isAuthenticated) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
    }
  }, [token, isAuthenticated, setPreferences]);

  const updateNotificationPreference = useCallback(async (
    category: string,
    preferences: Partial<Pick<NotificationPreference, 'inApp' | 'desktop' | 'sound'>>
  ) => {
    if (!token || !isAuthenticated) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/preferences/${category}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error('Failed to update notification preferences');
      }

      const data = await response.json();
      updatePreference(data.preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification preferences');
    }
  }, [token, isAuthenticated, updatePreference, setError]);

  // Initial fetch on mount and auth changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchUnreadCount();
      fetchPreferences();
    } else {
      clearNotifications();
    }
  }, [isAuthenticated, fetchNotifications, fetchUnreadCount, fetchPreferences, clearNotifications]);

  return {
    // State
    notifications,
    unreadCount,
    preferences,
    isLoading,
    error,

    // Actions
    fetchNotifications,
    fetchUnreadCount,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    deleteNotification: deleteNotificationById,
    createTestNotification,
    fetchPreferences,
    updatePreference: updateNotificationPreference,
    
    // Internal actions (for socket handling)
    addNotification,
    setUnreadCount
  };
};