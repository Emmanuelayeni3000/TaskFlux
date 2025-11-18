import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

import { useAuthStore } from '../store/authStore';
import { useNotifications } from './useNotifications';
import type { Notification } from '../store/notificationStore';
import { resolveSocketUrl } from './useWorkspaceChat';

const FALLBACK_SOCKET_URL = 'http://localhost:3000';

let socket: Socket | null = null;
let cachedSocketUrl: string | null = null;

export const useNotificationSocket = () => {
  const { token, isAuthenticated, user } = useAuthStore();
  const { addNotification, setUnreadCount } = useNotifications();

  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      // Disconnect socket if not authenticated
      if (socket) {
        socket.disconnect();
        socket = null;
        cachedSocketUrl = null;
      }
      return;
    }

    const resolvedUrl =
      resolveSocketUrl()
      ?? (typeof window !== 'undefined' ? window.location.origin : null)
      ?? FALLBACK_SOCKET_URL;

    if (!resolvedUrl) {
      console.error('[NotificationSocket] Socket URL not configured');
      return;
    }

    const normalizedUrl = resolvedUrl.trim().length > 0 ? resolvedUrl : FALLBACK_SOCKET_URL;

    // Connect to socket with authentication
    if (!socket || cachedSocketUrl !== normalizedUrl) {
      if (socket) {
        socket.disconnect();
      }

      socket = io(normalizedUrl, {
        auth: { token },
        transports: ['websocket'],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 15000,
      });

      cachedSocketUrl = normalizedUrl;
    } else {
      socket.auth = { token };
      if (socket.disconnected) {
        socket.connect();
      }
    }

    if (!socket) {
      return;
    }

    const handleConnect = () => {
      console.log('[NotificationSocket] Connected');
    };

    const handleDisconnect = (reason: string) => {
      console.log('[NotificationSocket] Disconnected:', reason);
    };

    const handleConnectError = (error: unknown) => {
      console.error('[NotificationSocket] Connection error:', error);
    };

    // Listen for new notifications
    const handleNewNotification = (notification: Notification) => {
      console.log('[NotificationSocket] New notification received:', notification);
      
      // Add to store
      addNotification(notification);

      // Show desktop notification if supported and enabled
      if (typeof window !== 'undefined' && notification.preferences?.desktop !== false && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico', // You can customize the icon
            tag: notification.id // Prevent duplicate notifications
          });
        } else if (Notification.permission !== 'denied') {
          // Request permission for future notifications
          Notification.requestPermission();
        }
      }

      // Play sound if enabled
      if (notification.preferences?.sound !== false) {
        playNotificationSound();
      }
    };

    // Listen for unread count updates
    const handleUnreadCountUpdate = (data: { unreadCount: number }) => {
      console.log('[NotificationSocket] Unread count updated:', data.unreadCount);
      setUnreadCount(data.unreadCount);
    };

    // Listen for workspace notifications (for workspace-specific events)
    const handleWorkspaceNotification = (notification: Notification) => {
      console.log('[NotificationSocket] Workspace notification received:', notification);
      // Handle workspace-specific notifications if needed
      // For now, treat them the same as regular notifications
      handleNewNotification(notification);
    };

    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
    socket.off('connect_error', handleConnectError);
    socket.off('notification:new', handleNewNotification);
    socket.off('notification:unread-count', handleUnreadCountUpdate);
    socket.off('notification:workspace', handleWorkspaceNotification);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('notification:new', handleNewNotification);
    socket.on('notification:unread-count', handleUnreadCountUpdate);
    socket.on('notification:workspace', handleWorkspaceNotification);

    // Cleanup function
    return () => {
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
        socket.off('notification:new', handleNewNotification);
        socket.off('notification:unread-count', handleUnreadCountUpdate);
        socket.off('notification:workspace', handleWorkspaceNotification);
      }
    };
  }, [isAuthenticated, token, user, addNotification, setUnreadCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
        cachedSocketUrl = null;
      }
    };
  }, []);

  return { socket };
};

// Helper function to play notification sound
const playNotificationSound = () => {
  try {
    if (typeof window === 'undefined') return;
    
    // Create a simple notification sound using Web Audio API
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    // Fallback: try to play a simple beep or ignore if not supported
    console.log('Could not play notification sound:', error);
  }
};