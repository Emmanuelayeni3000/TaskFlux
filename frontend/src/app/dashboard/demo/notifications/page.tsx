"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrentWorkspace } from '@/store/workspaceStore';

export default function NotificationDemoPage() {
  const { createTestNotification, fetchNotifications, fetchUnreadCount } = useNotifications();
  const currentWorkspace = useCurrentWorkspace();
  
  const [title, setTitle] = useState('Test Notification');
  const [message, setMessage] = useState('This is a test notification to check the system.');
  const [type, setType] = useState<'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'>('INFO');
  const [category, setCategory] = useState('system');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      alert('Please fill in both title and message');
      return;
    }

    setIsLoading(true);
    try {
      await createTestNotification({
        title,
        message,
        type,
        category,
        workspaceId: currentWorkspace?.id
      });
      
      // Refresh notifications after creating one
      await fetchNotifications();
      await fetchUnreadCount();
      
      alert('Test notification sent successfully!');
    } catch (error) {
      alert('Failed to send notification: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Notification System Demo</h1>
          <p className="text-gray-600 mt-2">
            Test the notification system by sending yourself a notification.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send Test Notification</CardTitle>
            <CardDescription>
              Create a test notification to see how the system works.
              {currentWorkspace && ` Current workspace: ${currentWorkspace.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Notification message"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(value: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR') => setType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="SUCCESS">Success</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="workspace">Workspace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleSendNotification} 
              disabled={isLoading || !title.trim() || !message.trim()}
              className="w-full"
            >
              {isLoading ? 'Sending...' : 'Send Test Notification'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Fill in the notification details above and click &quot;Send Test Notification&quot;</li>
              <li>Look for the notification bell icon in the top-right corner - it should show a red badge</li>
              <li>Click the bell icon to see your notification in the dropdown</li>
              <li>If you&apos;ve enabled desktop notifications, you should see a browser notification</li>
              <li>Go to &quot;Notification Settings&quot; from the user menu to configure your preferences</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}