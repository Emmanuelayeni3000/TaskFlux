import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../prisma/client';
import { HttpError } from '../middlewares/errorMiddleware';

const MESSAGE_PAGE_SIZE = 50;

export const createMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(2000),
  mentions: z
    .array(
      z.object({
        userId: z.string().cuid(),
        username: z.string().min(1),
      }),
    )
    .optional(),
});

export const chatMessageAuthorSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  username: true,
} as const;

type ChatMessageWithAuthor = Prisma.ChatMessageGetPayload<{
  include: {
    author: {
      select: typeof chatMessageAuthorSelect;
    };
  };
}>;

export const serializeMessage = (message: ChatMessageWithAuthor) => ({
  id: message.id,
  content: message.content,
  mentions: message.mentions,
  createdAt: message.createdAt,
  author: {
    id: message.author.id,
    email: message.author.email,
    firstName: message.author.firstName,
    lastName: message.author.lastName,
    username: message.author.username,
  },
});

const ensureTeamWorkspace = (req: Request) => {
  if (!req.workspace) {
    throw new HttpError(400, 'Workspace context missing');
  }

  if (req.workspace.type !== 'team') {
    throw new HttpError(403, 'Chat is only available in team workspaces');
  }

  return req.workspace;
};

export const ensureChatRoom = async (workspaceId: string) => {
  return prisma.chatRoom.upsert({
    where: { workspaceId },
    update: {},
    create: {
      workspaceId,
    },
  });
};

export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspace = ensureTeamWorkspace(req);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

    const room = await ensureChatRoom(workspace.id);

    const messages = await prisma.chatMessage.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: {
          select: chatMessageAuthorSelect,
        },
      },
    });

    const nextCursor = messages.length === MESSAGE_PAGE_SIZE ? messages[messages.length - 1].id : null;

    res.status(200).json({
      messages: messages.map(serializeMessage).reverse(),
      nextCursor,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const createMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError(401, 'Authentication required');
    }

    const workspace = ensureTeamWorkspace(req);
    const payload = createMessageSchema.parse(req.body);

    const room = await ensureChatRoom(workspace.id);

    const message = await prisma.chatMessage.create({
      data: {
        roomId: room.id,
        authorId: req.user.id,
        content: payload.content,
        mentions: payload.mentions?.length ? payload.mentions : undefined,
      },
      include: {
        author: {
          select: chatMessageAuthorSelect,
        },
      },
    });

    res.status(201).json({ message: serializeMessage(message) });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Invalid chat payload';
      next(new HttpError(400, firstIssue));
      return;
    }

    next(error);
  }
};
