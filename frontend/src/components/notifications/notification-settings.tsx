import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationPreference } from '@/store/notificationStore';

interface NotificationCategorySettingsProps {
  category: string;
  preferences?: NotificationPreference;
  onUpdate: (category: string, preferences: Partial<Pick<NotificationPreference, 'inApp' | 'desktop' | 'sound'>>) => void;
}

const getCategoryInfo = (category: string) => {
  switch (category) {
    case 'chat':
      return {
        title: 'Chat Messages',
        description: 'Get notified when someone sends a message in your team workspaces'
      };
    case 'task':
      return {
        title: 'Tasks',
        description: 'Notifications for task assignments, updates, and reminders'
      };
    case 'project':
      return {
        title: 'Projects',
        description: 'Updates when projects are created, modified, or completed'
      };
    case 'workspace':
      return {
        title: 'Workspace',
        description: 'Invitations and important workspace announcements'
      };
    case 'system':
      return {
        title: 'System',
        description: 'Important system updates and maintenance notifications'
      };
    default:
      return {
        title: category,
        description: `Notifications for ${category}`
      };
  }
};

const NotificationCategorySettings: React.FC<NotificationCategorySettingsProps> = ({
  category,
  preferences,
  onUpdate
}) => {
  const [localPrefs, setLocalPrefs] = useState({
    inApp: preferences?.inApp ?? true,
    desktop: preferences?.desktop ?? true,
    sound: preferences?.sound ?? true
  });

  const categoryInfo = getCategoryInfo(category);

  const handleUpdate = (key: keyof typeof localPrefs, value: boolean) => {
    const updatedPrefs = { ...localPrefs, [key]: value };
    setLocalPrefs(updatedPrefs);
    onUpdate(category, updatedPrefs);
  };

  useEffect(() => {
    setLocalPrefs({
      inApp: preferences?.inApp ?? true,
      desktop: preferences?.desktop ?? true,
      sound: preferences?.sound ?? true
    });
  }, [preferences]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base">{categoryInfo.title}</CardTitle>
        <CardDescription>{categoryInfo.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor={`${category}-inApp`}>In-app notifications</Label>
            <p className="text-sm text-gray-500">Show notifications in the app</p>
          </div>
          <Switch
            id={`${category}-inApp`}
            checked={localPrefs.inApp}
            onCheckedChange={(value: boolean) => handleUpdate('inApp', value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor={`${category}-desktop`}>Desktop notifications</Label>
            <p className="text-sm text-gray-500">Show browser notifications</p>
          </div>
          <Switch
            id={`${category}-desktop`}
            checked={localPrefs.desktop}
            onCheckedChange={(value: boolean) => handleUpdate('desktop', value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor={`${category}-sound`}>Sound alerts</Label>
            <p className="text-sm text-gray-500">Play sound when notifications arrive</p>
          </div>
          <Switch
            id={`${category}-sound`}
            checked={localPrefs.sound}
            onCheckedChange={(value: boolean) => handleUpdate('sound', value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export const NotificationSettings: React.FC = () => {
  const { preferences, updatePreference, fetchPreferences, createTestNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);

  const categories = ['chat', 'task', 'project', 'workspace', 'system'];

  const handleUpdatePreference = async (
    category: string,
    prefs: Partial<Pick<NotificationPreference, 'inApp' | 'desktop' | 'sound'>>
  ) => {
    setIsLoading(true);
    try {
      await updatePreference(category, prefs);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await createTestNotification({
        title: 'Test Notification',
        message: 'This is a test notification to check your settings.',
        type: 'INFO',
        category: 'system'
      });
    } catch (error) {
      console.error('Failed to create test notification:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Notification Settings</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTestNotification}>
            Send Test
          </Button>
          {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
            <Button onClick={requestNotificationPermission}>
              Enable Desktop Notifications
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Browser Notifications</CardTitle>
          <CardDescription>
            Desktop notifications require browser permission. 
            Current status: {
              typeof window !== 'undefined' && 'Notification' in window 
                ? Notification.permission === 'granted' 
                  ? 'Enabled' 
                  : Notification.permission === 'denied' 
                    ? 'Blocked' 
                    : 'Not enabled'
                : 'Not supported'
            }
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        <h3 className="text-md font-medium">Notification Categories</h3>
        <div className="grid gap-4">
          {categories.map(category => {
            const categoryPrefs = preferences.find(p => p.category === category);
            return (
              <NotificationCategorySettings
                key={category}
                category={category}
                preferences={categoryPrefs}
                onUpdate={handleUpdatePreference}
              />
            );
          })}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          Saving preferences...
        </div>
      )}
    </div>
  );
};