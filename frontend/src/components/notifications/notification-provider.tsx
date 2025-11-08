import { useEffect } from 'react';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';

export const NotificationProvider: React.FC = () => {
  // Initialize the notification socket connection
  useNotificationSocket();

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Don't auto-request, let user do it through settings
      console.log('Desktop notifications available, but permission not granted');
    }
  }, []);

  return null; // This is a provider component, no UI
};