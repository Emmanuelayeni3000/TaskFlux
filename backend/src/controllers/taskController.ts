import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma/client';
import { HttpError } from '../middlewares/errorMiddleware';
import { assertCapability } from '../utils/workspacePermissions';
import { NotificationService } from '../services/notificationService';
import { getIO } from '../realtime/socket';

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
 *         projectId:
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
 *         projectId:
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
 *         projectId:
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
  description: z.string().max(2000).optional().or(z.null()).transform(val => val || undefined),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  dueDate: dateTimeSchema.optional(),
  reminderAt: dateTimeSchema.optional(),
  projectId: z.string().max(100).optional().or(z.null()).transform(val => val || undefined),
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

const ensureWorkspace = (req: Request) => {
  if (!req.workspace) {
    throw new HttpError(400, 'Workspace context missing');
  }

  return req.workspace;
};

export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req);
    const workspace = ensureWorkspace(req);
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId: workspace.id,
        userId: user.id,
      },
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
    const workspace = ensureWorkspace(req);
    assertCapability(workspace.capabilities, 'canCreateTasks', 'You cannot create tasks in this workspace');
    
    console.log('🔍 TaskController: Raw request body:', JSON.stringify(req.body, null, 2));
    
    const payload = createTaskSchema.parse(req.body);

    const { projectId, ...restOfPayload } = payload;

    // Create base data for unchecked create (with direct foreign keys)
    const baseData = {
      ...restOfPayload,
      userId: user.id,
      workspaceId: workspace.id,
      projectId: undefined as string | undefined,
    };

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId: workspace.id },
      });

      if (!project) {
        throw new HttpError(400, 'Project not found in this workspace');
      }

      baseData.projectId = projectId;
    }

    console.log('Creating task with data:', baseData);
    
    const task = await prisma.task.create({
      data: baseData,
    });
    
    console.log('Task created successfully:', task);

    // Send notification if this is a team workspace
    if (workspace.type === 'team') {
      try {
        const io = getIO();
        const notificationService = new NotificationService(prisma, io ?? undefined);
        
        // Get workspace members (excluding the task creator)
        const workspaceMembers = await prisma.workspaceMembership.findMany({
          where: {
            workspaceId: workspace.id,
            userId: { not: user.id }
          },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, username: true }
            }
          }
        });

        if (workspaceMembers.length > 0) {
          // Get full user details for the notification
          const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { firstName: true, lastName: true, username: true, email: true }
          });
          
          const creatorName = fullUser?.firstName || fullUser?.username || user.email;
          
          await Promise.all(
            workspaceMembers.map(member =>
              notificationService.createNotification({
                title: `New task: ${task.title}`,
                message: `${creatorName} created a new task in ${workspace.name}`,
                type: 'INFO',
                category: 'task',
                userId: member.userId,
                workspaceId: workspace.id,
                metadata: {
                  taskId: task.id,
                  creatorId: user.id,
                  creatorName,
                  action: 'created'
                }
              })
            )
          );
        }
      } catch (notificationError) {
        // Don't fail task creation if notification fails
        console.error('Failed to send task creation notification:', notificationError);
      }
    }

    res.status(201).json({ task });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error('🚨 TaskController: Validation error:', error.issues);
      const firstIssue = error.issues[0];
      const errorMessage = firstIssue 
        ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
        : 'Invalid task payload';
      next(new HttpError(400, errorMessage));
      return;
    }

    console.error('🚨 TaskController: Unexpected error:', error);
    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureUser(req);
    const { id } = req.params;
    const workspace = ensureWorkspace(req);
    assertCapability(workspace.capabilities, 'canManageTasks', 'You cannot modify tasks in this workspace');
    const payload = updateTaskSchema.parse(req.body);

    const existing = await prisma.task.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!existing) {
      throw new HttpError(404, 'Task not found');
    }

    const { projectId, ...restOfPayload } = payload;

    // Create base data for unchecked update
    const baseData = { ...restOfPayload };
    
    if (projectId !== undefined) {
      if (projectId) {
        const project = await prisma.project.findFirst({
          where: { id: projectId, workspaceId: workspace.id },
        });

        if (!project) {
          throw new HttpError(400, 'Project not found in this workspace');
        }

        (baseData as { projectId?: string | null }).projectId = projectId;
      } else {
        // projectId is null, disconnect from project
        (baseData as { projectId?: string | null }).projectId = null;
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: baseData,
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
    ensureUser(req);
    const { id } = req.params;

    const workspace = ensureWorkspace(req);
    assertCapability(workspace.capabilities, 'canManageTasks', 'You cannot delete tasks in this workspace');

    const existing = await prisma.task.findFirst({ where: { id, workspaceId: workspace.id } });
    if (!existing) {
      throw new HttpError(404, 'Task not found');
    }

    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    next(error);
  }
};
