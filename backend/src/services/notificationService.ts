import { PrismaClient, NotificationType, Notification, NotificationPreference } from '@prisma/client';
import { Server } from 'socket.io';

interface NotificationPayload {
  title: string;
  message: string;
  type?: NotificationType;
  category: string;
  userId: string;
  workspaceId?: string;
  metadata?: Record<string, any>;
}

interface NotificationWithPrefs extends Notification {
  preferences?: NotificationPreference | null;
}

export class NotificationService {
  constructor(
    private prisma: PrismaClient,
    private io?: Server
  ) {}

  /**
   * Create a new notification
   */
  async createNotification(payload: NotificationPayload): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        title: payload.title,
        message: payload.message,
        type: payload.type || NotificationType.INFO,
        category: payload.category,
        userId: payload.userId,
        workspaceId: payload.workspaceId,
        metadata: payload.metadata || {},
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          }
        },
        workspace: {
          select: {
            id: true,
            name: true,
            type: true,
          }
        }
      }
    });

    // Get user preferences for this notification category
    const preferences = await this.getUserPreferences(payload.userId, payload.category);

    // Send real-time notification if user has in-app notifications enabled
    if (this.io && preferences?.inApp !== false) {
      this.io.to(`user:${payload.userId}`).emit('notification:new', {
        ...notification,
        preferences
      });

      // Also emit to workspace room if applicable
      if (payload.workspaceId) {
        this.io.to(`workspace:${payload.workspaceId}`).emit('notification:workspace', {
          ...notification,
          preferences
        });
      }
    }

    return notification;
  }

  /**
   * Create multiple notifications (bulk)
   */
  async createBulkNotifications(notifications: NotificationPayload[]): Promise<Notification[]> {
    const createdNotifications = await Promise.all(
      notifications.map(payload => this.createNotification(payload))
    );

    return createdNotifications;
  }

  /**
   * Get notifications for a user with pagination
   */
  async getUserNotifications(
    userId: string, 
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      workspaceId?: string;
      category?: string;
    } = {}
  ): Promise<{ notifications: NotificationWithPrefs[], totalCount: number, unreadCount: number }> {
    const { page = 1, limit = 20, unreadOnly = false, workspaceId, category } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      ...(unreadOnly && { isRead: false }),
      ...(workspaceId && { workspaceId }),
      ...(category && { category }),
    };

    const [notifications, totalCount, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
            }
          },
          workspace: {
            select: {
              id: true,
              name: true,
              type: true,
            }
          }
        }
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false }
      })
    ]);

    // Get preferences for each notification category
    const notificationsWithPrefs = await Promise.all(
      notifications.map(async (notification) => {
        const preferences = await this.getUserPreferences(userId, notification.category);
        return {
          ...notification,
          preferences
        };
      })
    );

    return {
      notifications: notificationsWithPrefs,
      totalCount,
      unreadCount
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification | null> {
    const notification = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
        updatedAt: new Date(),
      }
    });

    if (notification.count > 0) {
      // Emit updated unread count
      const unreadCount = await this.getUnreadCount(userId);
      if (this.io) {
        this.io.to(`user:${userId}`).emit('notification:unread-count', { unreadCount });
      }

      return await this.prisma.notification.findUnique({
        where: { id: notificationId }
      });
    }

    return null;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, workspaceId?: string): Promise<number> {
    const where: any = {
      userId,
      isRead: false,
      ...(workspaceId && { workspaceId }),
    };

    const result = await this.prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        updatedAt: new Date(),
      }
    });

    // Emit updated unread count
    const unreadCount = await this.getUnreadCount(userId);
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification:unread-count', { unreadCount });
    }

    return result.count;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      }
    });

    return result.count > 0;
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string, workspaceId?: string): Promise<number> {
    const where: any = {
      userId,
      isRead: false,
      ...(workspaceId && { workspaceId }),
    };

    return await this.prisma.notification.count({ where });
  }

  /**
   * Get or create user preferences for a notification category
   */
  async getUserPreferences(userId: string, category: string): Promise<NotificationPreference | null> {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_category: {
          userId,
          category
        }
      }
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await this.prisma.notificationPreference.create({
        data: {
          userId,
          category,
          inApp: true,
          desktop: true,
          sound: true,
        }
      });
    }

    return preferences;
  }

  /**
   * Update user preferences for a notification category
   */
  async updateUserPreferences(
    userId: string, 
    category: string, 
    preferences: Partial<Pick<NotificationPreference, 'inApp' | 'desktop' | 'sound'>>
  ): Promise<NotificationPreference> {
    return await this.prisma.notificationPreference.upsert({
      where: {
        userId_category: {
          userId,
          category
        }
      },
      create: {
        userId,
        category,
        inApp: preferences.inApp ?? true,
        desktop: preferences.desktop ?? true,
        sound: preferences.sound ?? true,
      },
      update: {
        ...preferences,
        updatedAt: new Date(),
      }
    });
  }

  /**
   * Get all user preferences
   */
  async getAllUserPreferences(userId: string): Promise<NotificationPreference[]> {
    return await this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { category: 'asc' }
    });
  }

  /**
   * Helper methods to create specific notification types
   */

  // Chat notifications
  async notifyNewChatMessage(params: {
    workspaceId: string;
    senderId: string;
    recipientIds: string[];
    messageContent: string;
    senderName: string;
  }) {
    const notifications = params.recipientIds
      .filter(id => id !== params.senderId) // Don't notify the sender
      .map(userId => ({
        title: `New message from ${params.senderName}`,
        message: params.messageContent.substring(0, 100) + (params.messageContent.length > 100 ? '...' : ''),
        type: NotificationType.INFO,
        category: 'chat',
        userId,
        workspaceId: params.workspaceId,
        metadata: {
          senderId: params.senderId,
          senderName: params.senderName,
          messageId: params.workspaceId, // You might want to pass actual messageId
        }
      }));

    return await this.createBulkNotifications(notifications);
  }

  // Task notifications
  async notifyTaskAssignment(params: {
    taskId: string;
    taskTitle: string;
    assignerId: string;
    assignerName: string;
    assigneeId: string;
    workspaceId: string;
  }) {
    return await this.createNotification({
      title: `Task assigned: ${params.taskTitle}`,
      message: `${params.assignerName} assigned you a new task`,
      type: NotificationType.INFO,
      category: 'task',
      userId: params.assigneeId,
      workspaceId: params.workspaceId,
      metadata: {
        taskId: params.taskId,
        assignerId: params.assignerId,
        assignerName: params.assignerName,
      }
    });
  }

  // Task reminder notifications
  async notifyTaskReminder(params: {
    taskId: string;
    taskTitle: string;
    userId: string;
    workspaceId: string;
    dueDate: Date;
  }) {
    return await this.createNotification({
      title: `Task reminder: ${params.taskTitle}`,
      message: `Your task is due soon`,
      type: NotificationType.WARNING,
      category: 'task',
      userId: params.userId,
      workspaceId: params.workspaceId,
      metadata: {
        taskId: params.taskId,
        dueDate: params.dueDate.toISOString(),
      }
    });
  }

  // Workspace invitation notifications
  async notifyWorkspaceInvitation(params: {
    workspaceId: string;
    workspaceName: string;
    inviterId: string;
    inviterName: string;
    inviteeId: string;
  }) {
    return await this.createNotification({
      title: `Workspace invitation: ${params.workspaceName}`,
      message: `${params.inviterName} invited you to join their workspace`,
      type: NotificationType.INFO,
      category: 'workspace',
      userId: params.inviteeId,
      workspaceId: params.workspaceId,
      metadata: {
        inviterId: params.inviterId,
        inviterName: params.inviterName,
      }
    });
  }

  // Project notifications
  async notifyProjectUpdate(params: {
    projectId: string;
    projectName: string;
    updateType: 'created' | 'updated' | 'completed';
    updaterId: string;
    updaterName: string;
    recipientIds: string[];
    workspaceId: string;
  }) {
    const actionText = params.updateType === 'created' ? 'created' : 
                      params.updateType === 'updated' ? 'updated' : 'completed';
    
    const notifications = params.recipientIds
      .filter(id => id !== params.updaterId)
      .map(userId => ({
        title: `Project ${actionText}: ${params.projectName}`,
        message: `${params.updaterName} ${actionText} the project`,
        type: NotificationType.INFO,
        category: 'project',
        userId,
        workspaceId: params.workspaceId,
        metadata: {
          projectId: params.projectId,
          updateType: params.updateType,
          updaterId: params.updaterId,
          updaterName: params.updaterName,
        }
      }));

    return await this.createBulkNotifications(notifications);
  }
}