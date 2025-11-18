import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';

import { prisma } from '../prisma/client';
import { NotificationService } from '../services/notificationService';

let ioInstance: Server | null = null;
import {
  chatMessageSchemaBase,
  chatMessageAuthorSelect,
  ensureChatRoom,
  serializeMessage,
  validateChatMessagePayload,
} from '../controllers/chatController';
import { verifyAccessToken } from '../utils/token';

interface SocketAuthContext {
  userId: string;
  email: string;
  joinedWorkspaces: Set<string>;
}

const messageEventSchema = chatMessageSchemaBase
  .extend({
    workspaceId: z.string().cuid(),
  })
  .superRefine((value, ctx) => {
    const { workspaceId: _workspaceId, ...messagePayload } = value;
    validateChatMessagePayload(messagePayload, ctx);
  });

const getSocketAuth = (socket: Socket): SocketAuthContext => {
  if (!socket.data) {
    socket.data = {};
  }

  if (!socket.data.joinedWorkspaces) {
    socket.data.joinedWorkspaces = new Set<string>();
  }

  return socket.data as SocketAuthContext;
};

const extractToken = (socket: Socket): string | undefined => {
  if (typeof socket.handshake.auth?.token === 'string') {
    return socket.handshake.auth.token;
  }

  const header = socket.handshake.headers?.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.substring(7).trim();
  }

  return undefined;
};

export const initSocketServer = (
  server: HttpServer,
  options: { allowedOrigins?: string[] }
) => {
  const io = new Server(server, {
    cors: {
      origin: options.allowedOrigins && options.allowedOrigins.length > 0 ? options.allowedOrigins : '*',
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        next(new Error('Authentication token missing'));
        return;
      }

      const payload = verifyAccessToken(token);
      const auth = getSocketAuth(socket);
      auth.userId = payload.userId;
      auth.email = payload.email;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const auth = getSocketAuth(socket);
    console.info('[Socket] Connected', { socketId: socket.id, userId: auth.userId });

    // Join user's personal notification room
    if (auth.userId) {
      socket.join(`user:${auth.userId}`);
    }

    socket.on('chat:join', async (raw, callback) => {
      try {
        if (!auth.userId) {
          throw new Error('Unauthenticated socket');
        }

        const workspaceId = typeof raw === 'string' ? raw : raw?.workspaceId;
        if (typeof workspaceId !== 'string' || workspaceId.length === 0) {
          throw new Error('workspaceId is required');
        }

        const membership = await prisma.workspaceMembership.findFirst({
          where: { userId: auth.userId, workspaceId },
          include: {
            workspace: {
              select: { type: true },
            },
          },
        });

        if (!membership) {
          throw new Error('You do not have access to this workspace');
        }

        if (membership.workspace.type !== 'team') {
          throw new Error('Chat is only available for team workspaces');
        }

        await ensureChatRoom(workspaceId);

        socket.join(`workspace:${workspaceId}`);
        auth.joinedWorkspaces.add(workspaceId);

        if (typeof callback === 'function') {
          callback({ status: 'ok' });
        }
      } catch (error) {
        if (typeof callback === 'function') {
          callback({ status: 'error', message: error instanceof Error ? error.message : 'Unable to join chat' });
        }
      }
    });

    socket.on('chat:message', async (raw, callback) => {
      try {
        if (!auth.userId) {
          throw new Error('Unauthenticated socket');
        }

  const payload = messageEventSchema.parse(raw);
  const workspaceId = payload.workspaceId;
  const messageType = payload.type ?? 'TEXT';
  const trimmedContent = payload.content?.trim() ?? '';
  const captionContent = trimmedContent.length > 0 ? trimmedContent : null;

        if (!auth.joinedWorkspaces.has(workspaceId)) {
          throw new Error('Join the workspace chat before sending messages');
        }

        const membership = await prisma.workspaceMembership.findFirst({
          where: { userId: auth.userId, workspaceId },
          include: {
            workspace: {
              select: { type: true },
            },
          },
        });

        if (!membership) {
          throw new Error('You do not have access to this workspace');
        }

        if (membership.workspace.type !== 'team') {
          throw new Error('Chat is only available for team workspaces');
        }

        const room = await ensureChatRoom(workspaceId);

        const message = await prisma.chatMessage.create({
          data: {
            roomId: room.id,
            authorId: auth.userId,
            type: messageType,
            content: messageType === 'TEXT' ? trimmedContent : captionContent,
            attachmentUrl: messageType === 'TEXT' ? null : payload.attachmentUrl ?? null,
            attachmentMimeType:
              messageType === 'TEXT' ? null : payload.attachmentMimeType ?? null,
            attachmentDurationMs:
              messageType === 'AUDIO' && typeof payload.attachmentDurationMs === 'number'
                ? payload.attachmentDurationMs
                : null,
            mentions: payload.mentions?.length ? payload.mentions : undefined,
          },
          include: {
            author: {
              select: chatMessageAuthorSelect,
            },
          },
        });

        const serialized = serializeMessage(message);
        const payloadWithWorkspace = { ...serialized, workspaceId };

        io.to(`workspace:${workspaceId}`).emit('chat:message', payloadWithWorkspace);

        // Send notifications to workspace members (except the sender)
        const workspaceMembers = await prisma.workspaceMembership.findMany({
          where: { 
            workspaceId,
            userId: { not: auth.userId }
          },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, username: true }
            }
          }
        });

        if (workspaceMembers.length > 0) {
          const notificationService = new NotificationService(prisma, io);
          const senderName = message.author.firstName || message.author.username || message.author.email;
          const notificationPreviewRaw =
            messageType === 'TEXT'
              ? trimmedContent
              : captionContent ?? (messageType === 'IMAGE' ? 'Sent an image' : 'Sent a voice note');
          const notificationPreview = notificationPreviewRaw && notificationPreviewRaw.length > 0
            ? notificationPreviewRaw
            : 'New chat message';

          await notificationService.notifyNewChatMessage({
            workspaceId,
            senderId: auth.userId,
            recipientIds: workspaceMembers.map(m => m.userId),
            messageContent: notificationPreview,
            senderName
          });
        }

        if (typeof callback === 'function') {
          callback({ status: 'ok', message: payloadWithWorkspace });
        }
      } catch (error) {
        if (typeof callback === 'function') {
          callback({ status: 'error', message: error instanceof Error ? error.message : 'Unable to send message' });
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.info('[Socket] Disconnected', {
        socketId: socket.id,
        userId: auth.userId,
        reason,
      });
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = (): Server | null => {
  return ioInstance;
};
