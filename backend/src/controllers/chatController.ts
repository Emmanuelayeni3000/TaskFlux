import fs from 'fs';
import path from 'path';
import multer, { type FileFilterCallback } from 'multer';
import type { Express, NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../prisma/client';
import { HttpError } from '../middlewares/errorMiddleware';

const MESSAGE_PAGE_SIZE = 50;
const CHAT_UPLOAD_LIMIT_BYTES = 15 * 1024 * 1024; // 15MB
const SUPPORTED_ATTACHMENT_PREFIXES = ['image/', 'audio/'];

const DEFAULT_CHAT_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'chat');
const CHAT_UPLOAD_BASE = process.env.CHAT_UPLOAD_DIR
  ? path.resolve(process.env.CHAT_UPLOAD_DIR)
  : DEFAULT_CHAT_UPLOAD_DIR;
const UPLOADS_ROOT = path.resolve(CHAT_UPLOAD_BASE, '..');

const ensureUploadDirectory = () => {
  if (!fs.existsSync(CHAT_UPLOAD_BASE)) {
    fs.mkdirSync(CHAT_UPLOAD_BASE, { recursive: true });
  }
};

const resolveAttachmentFilename = (originalName: string, mimeType: string) => {
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_');
  const trimmed = baseName.length > 48 ? baseName.slice(0, 48) : baseName;
  const timestamp = Date.now();
  const extensionFromName = path.extname(originalName);
  const fallbackExtension = mimeType.startsWith('image/')
    ? '.png'
    : mimeType.startsWith('audio/')
      ? '.webm'
      : '.bin';
  const extension = extensionFromName || fallbackExtension;
  return `${timestamp}-${trimmed || 'attachment'}${extension}`;
};

const chatUploadStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) => {
    ensureUploadDirectory();
    callback(null, CHAT_UPLOAD_BASE);
  },
  filename: (_req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
    callback(null, resolveAttachmentFilename(file.originalname, file.mimetype));
  },
});

const attachmentUpload = multer({
  storage: chatUploadStorage,
  limits: { fileSize: CHAT_UPLOAD_LIMIT_BYTES },
  fileFilter: (_req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    if (SUPPORTED_ATTACHMENT_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix))) {
      callback(null, true);
      return;
    }

    callback(new Error('Unsupported attachment type'));
  },
});

export const chatAttachmentUpload = attachmentUpload.single('attachment');

const buildPublicUrl = (req: Request, publicPath: string) => {
  const host = req.get('x-forwarded-host') ?? req.get('host');
  if (!host) {
    return publicPath;
  }

  const protoHeader = req.get('x-forwarded-proto') ?? req.protocol ?? 'http';
  const protocol = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
  return `${protocol}://${host}${publicPath.startsWith('/') ? publicPath : `/${publicPath}`}`;
};

const toPublicPath = (filePath: string) => {
  const relative = path.relative(UPLOADS_ROOT, filePath).replace(/\\/g, '/');
  return `/uploads/${relative}`;
};

const removeFileQuietly = (filePath: string) => {
  fs.promises.unlink(filePath).catch(() => undefined);
};

const messageTypeEnum = z.enum(['TEXT', 'IMAGE', 'AUDIO']);

export const chatMessageSchemaBase = z.object({
  type: messageTypeEnum.optional(),
  content: z
    .string()
    .trim()
    .max(2000, 'Message content exceeds 2000 characters')
    .optional(),
  attachmentUrl: z.string().url('Attachment URL must be a valid URL').optional(),
  attachmentMimeType: z.string().max(255).optional(),
  attachmentDurationMs: z.number().int().nonnegative().optional(),
  mentions: z
    .array(
      z.object({
        userId: z.string().cuid(),
        username: z.string().min(1),
      }),
    )
    .optional(),
});

type ChatMessagePayload = z.infer<typeof chatMessageSchemaBase>;

export const validateChatMessagePayload = (value: ChatMessagePayload, ctx: z.RefinementCtx) => {
  const type = value.type ?? 'TEXT';
  const content = value.content?.trim() ?? '';

  if (type === 'TEXT' && content.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['content'],
      message: 'Message content is required',
    });
  }

  if (type !== 'TEXT' && !value.attachmentUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['attachmentUrl'],
      message: 'Attachment URL is required for media messages',
    });
  }
};

export const createMessageSchema = chatMessageSchemaBase.superRefine(validateChatMessagePayload);

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
  type: message.type,
  content: message.content,
  attachmentUrl: message.attachmentUrl,
  attachmentMimeType: message.attachmentMimeType,
  attachmentDurationMs: message.attachmentDurationMs,
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

    const messages = (await prisma.chatMessage.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: {
          select: chatMessageAuthorSelect,
        },
      },
    })) as ChatMessageWithAuthor[];

    const nextCursor = messages.length === MESSAGE_PAGE_SIZE ? messages[messages.length - 1].id : null;

    res.status(200).json({
  messages: messages.map((message) => serializeMessage(message)).reverse(),
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

    const messageType = payload.type ?? 'TEXT';
    const trimmedContent = payload.content?.trim() ?? '';
    const captionContent = trimmedContent.length > 0 ? trimmedContent : null;

    const message = (await prisma.chatMessage.create({
      data: {
        roomId: room.id,
        authorId: req.user.id,
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
    })) as ChatMessageWithAuthor;

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

export const uploadAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureTeamWorkspace(req);

    const multerRequest = req as Request & { file?: Express.Multer.File; };
    const uploadedFile = multerRequest.file;

    if (!uploadedFile) {
      throw new HttpError(400, 'Attachment file is required');
    }

    const publicPath = toPublicPath(uploadedFile.path);
    const publicUrl = buildPublicUrl(req, publicPath);
    const rawDuration = typeof req.body?.durationMs === 'string' ? Number.parseInt(req.body.durationMs, 10) : undefined;
    const durationMs = Number.isFinite(rawDuration) && rawDuration! >= 0 ? Number(rawDuration) : undefined;

    res.status(201).json({
      url: publicUrl,
      mimeType: uploadedFile.mimetype,
      size: uploadedFile.size,
      durationMs,
    });
  } catch (error) {
    const multerRequest = req as Request & { file?: Express.Multer.File };
    if (multerRequest.file) {
      removeFileQuietly(multerRequest.file.path);
    }
    next(error);
  }
};
