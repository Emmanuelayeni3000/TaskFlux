import React, { useState, useEffect } from 'react';
import { X, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Notification } from '@/store/notificationStore';

interface ToastNotificationProps {
  notification: Notification;
  onDismiss: () => void;
  autoHide?: boolean;
  duration?: number;
}

const getTypeIcon = (type: string) => {
  const iconClass = "h-5 w-5";
  
  switch (type) {
    case 'SUCCESS':
      return <CheckCircle className={`${iconClass} text-green-500`} />;
    case 'WARNING':
      return <AlertTriangle className={`${iconClass} text-yellow-500`} />;
    case 'ERROR':
      return <XCircle className={`${iconClass} text-red-500`} />;
    default:
      return <Info className={`${iconClass} text-blue-500`} />;
  }
};

const getTypeStyles = (type: string) => {
  switch (type) {
    case 'SUCCESS':
      return 'border-green-200 bg-green-50';
    case 'WARNING':
      return 'border-yellow-200 bg-yellow-50';
    case 'ERROR':
      return 'border-red-200 bg-red-50';
    default:
      return 'border-blue-200 bg-blue-50';
  }
};

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  notification,
  onDismiss,
  autoHide = true,
  duration = 5000
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for fade out animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div 
      className={`
        fixed top-4 right-4 z-50 w-80 p-4 rounded-lg border shadow-lg
        transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getTypeStyles(notification.type)}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getTypeIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4 className="text-sm font-semibold text-gray-900">
              {notification.title}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-sm text-gray-700 mt-1">
            {notification.message}
          </p>
          
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {notification.category}
            </Badge>
            {notification.workspace && (
              <Badge variant="secondary" className="text-xs">
                {notification.workspace.name}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast container for managing multiple toasts
interface ToastContainerProps {
  notifications: Notification[];
  onDismiss: (notificationId: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  notifications,
  onDismiss
}) => {
  return (
    <div className="fixed top-0 right-0 z-50 pointer-events-none">
      <div className="flex flex-col gap-2 p-4">
        {notifications.map((notification, index) => (
          <div key={notification.id} className="pointer-events-auto" style={{ zIndex: 50 + index }}>
            <ToastNotification
              notification={notification}
              onDismiss={() => onDismiss(notification.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};