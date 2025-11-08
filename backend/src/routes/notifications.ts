import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { requireAuth as auth } from '../middlewares/authMiddleware';
import { prisma } from '../prisma/client';
import { getIO } from '../realtime/socket';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}

const router = Router();

// Initialize notification service
const getNotificationService = () => {
  const io = getIO();
  return new NotificationService(prisma, io ?? undefined);
};

/**
 * GET /notifications
 * Get user notifications with pagination and filtering
 */
router.get('/', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      page = '1',
      limit = '20',
      unreadOnly = 'false',
      workspaceId,
      category
    } = req.query as Record<string, string>;

    const notificationService = getNotificationService();
    const result = await notificationService.getUserNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
      workspaceId,
      category
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /notifications/unread-count
 * Get unread notification count for the user
 */
router.get('/unread-count', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { workspaceId } = req.query as Record<string, string>;
    const notificationService = getNotificationService();
    const unreadCount = await notificationService.getUnreadCount(userId, workspaceId);

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /notifications/:id/read
 * Mark a specific notification as read
 */
router.put('/:id/read', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const notificationService = getNotificationService();
    const notification = await notificationService.markAsRead(id, userId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /notifications/read-all
 * Mark all notifications as read for the user
 */
router.put('/read-all', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { workspaceId } = req.body;
    const notificationService = getNotificationService();
    const updatedCount = await notificationService.markAllAsRead(userId, workspaceId);

    res.json({ success: true, updatedCount });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /notifications/:id
 * Delete a specific notification
 */
router.delete('/:id', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const notificationService = getNotificationService();
    const deleted = await notificationService.deleteNotification(id, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /notifications/test
 * Create a test notification (for development/testing)
 */
router.post('/test', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, message, type, category, workspaceId } = req.body;

    if (!title || !message || !category) {
      return res.status(400).json({ error: 'Title, message, and category are required' });
    }

    const notificationService = getNotificationService();
    const notification = await notificationService.createNotification({
      title,
      message,
      type,
      category,
      userId,
      workspaceId,
      metadata: { test: true }
    });

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /notifications/preferences
 * Get user notification preferences
 */
router.get('/preferences', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationService = getNotificationService();
    const preferences = await notificationService.getAllUserPreferences(userId);

    res.json({ preferences });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /notifications/preferences/:category
 * Update user notification preferences for a specific category
 */
router.put('/preferences/:category', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { category } = req.params;
    const { inApp, desktop, sound } = req.body;

    if (typeof inApp !== 'boolean' && typeof desktop !== 'boolean' && typeof sound !== 'boolean') {
      return res.status(400).json({ error: 'At least one preference (inApp, desktop, sound) must be provided' });
    }

    const notificationService = getNotificationService();
    const preferences = await notificationService.updateUserPreferences(userId, category, {
      inApp,
      desktop,
      sound
    });

    res.json({ success: true, preferences });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;