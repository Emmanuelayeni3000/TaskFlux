import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  MessageSquare, 
  Calendar,
  FolderOpen,
  Users,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification } from '@/store/notificationStore';

const getNotificationIcon = (category: string, type: string) => {
  const iconClass = "h-4 w-4";
  
  switch (category) {
    case 'chat':
      return <MessageSquare className={iconClass} />;
    case 'task':
      return <Calendar className={iconClass} />;
    case 'project':
      return <FolderOpen className={iconClass} />;
    case 'workspace':
      return <Users className={iconClass} />;
    default:
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
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'SUCCESS':
      return 'bg-green-50 border-green-200';
    case 'WARNING':
      return 'bg-yellow-50 border-yellow-200';
    case 'ERROR':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-blue-50 border-blue-200';
  }
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete
}) => {
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true
  });

  return (
    <div 
      className={`p-3 border-l-4 ${!notification.isRead ? 'bg-gray-50' : ''} ${getTypeColor(notification.type)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 mt-1">
            {getNotificationIcon(notification.category, notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                {notification.title}
              </h4>
              <div className="flex items-center gap-1 ml-2">
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {notification.message}
            </p>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {notification.category}
                </Badge>
                {notification.workspace && (
                  <Badge variant="secondary" className="text-xs">
                    {notification.workspace.name}
                  </Badge>
                )}
              </div>
              <time className="text-xs text-gray-500">
                {timeAgo}
              </time>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkAsRead(notification.id)}
              className="h-8 w-8 p-0"
              title="Mark as read"
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(notification.id)}
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
            title="Delete notification"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const NotificationDropdown: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications
  } = useNotifications();

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleRefresh = () => {
    fetchNotifications();
  };

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-red-600 mb-2">Failed to load notifications</p>
        <Button size="sm" onClick={handleRefresh}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {unreadCount} new
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="text-blue-600 hover:text-blue-700"
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-8 text-center">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No notifications yet</p>
        </div>
      ) : (
        <ScrollArea className="h-96">
          <div className="divide-y divide-gray-100">
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <NotificationItem
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
                {index < notifications.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t">
          <Button variant="ghost" size="sm" className="w-full" onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
};