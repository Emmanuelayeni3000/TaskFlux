import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma/client';
import { HttpError } from '../middlewares/errorMiddleware';

/**
 * @openapi
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [TODO, IN_PROGRESS, DONE, ARCHIVED]
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         dueDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         reminderAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         project:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     TaskInput:
 *       type: object
 *       required: [title]
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *         priority:
 *           type: string
 *         dueDate:
 *           type: string
 *           format: date-time
 *         reminderAt:
 *           type: string
 *           format: date-time
 *         project:
 *           type: string
 *     TaskUpdate:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *         priority:
 *           type: string
 *         dueDate:
 *           type: string
 *           format: date-time
 *         reminderAt:
 *           type: string
 *           format: date-time
 *         project:
 *           type: string
 */
const statusEnum = z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED']);
const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const dateTimeSchema = z
  .string()
  .datetime({ message: 'Dates must be valid ISO-8601 strings' })
  .transform((value: string) => new Date(value));

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  dueDate: dateTimeSchema.optional(),
  reminderAt: dateTimeSchema.optional(),
  project: z.string().max(100).optional(),
});

const updateTaskSchema = createTaskSchema
  .partial()
  .refine((data: Record<string, unknown>) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

const ensureUser = (req: Request) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }

  return req.user;
};

export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req);
    const tasks = await prisma.task.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ tasks });
  } catch (error: unknown) {
    next(error);
  }
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req);
    const payload = createTaskSchema.parse(req.body);

    const task = await prisma.task.create({
      data: {
        ...payload,
        userId: user.id,
      },
    });

    res.status(201).json({ task });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Invalid task payload';
      next(new HttpError(400, firstIssue));
      return;
    }

    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req);
    const { id } = req.params;
    const payload = updateTaskSchema.parse(req.body);

    const existing = await prisma.task.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      throw new HttpError(404, 'Task not found');
    }

    const task = await prisma.task.update({
      where: { id },
      data: { ...payload },
    });

    res.status(200).json({ task });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Invalid task payload';
      next(new HttpError(400, firstIssue));
      return;
    }

    next(error);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req);
    const { id } = req.params;

    const existing = await prisma.task.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      throw new HttpError(404, 'Task not found');
    }

    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    next(error);
  }
};
