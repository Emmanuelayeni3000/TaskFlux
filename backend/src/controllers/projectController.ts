import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma/client';
import { HttpError } from '../middlewares/errorMiddleware';
import { assertCapability } from '../utils/workspacePermissions';

const statusEnum = z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']);
const dateTimeSchema = z
  .string()
  .datetime({ message: 'Dates must be valid ISO-8601 strings' })
  .transform((value: string) => new Date(value));

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(2000).optional(),
  status: statusEnum.optional(),
  startDate: dateTimeSchema.optional(),
  endDate: dateTimeSchema.optional(),
});

const updateProjectSchema = createProjectSchema.partial().refine(
  (data: Record<string, unknown>) => Object.keys(data).length > 0,
  {
    message: 'Provide at least one field to update',
  },
);

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

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureUser(req);
    const workspace = ensureWorkspace(req);
    const projects = await prisma.project.findMany({
      where: { workspaceId: workspace.id },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            dueDate: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ projects });
  } catch (error: unknown) {
    next(error);
  }
};

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req);
    const workspace = ensureWorkspace(req);
    assertCapability(workspace.capabilities, 'canManageProjects', 'You cannot create projects in this workspace');
    const payload = createProjectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        ...payload,
        userId: user.id,
        workspaceId: workspace.id,
      },
    });

    res.status(201).json({ project });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Invalid project payload';
      next(new HttpError(400, firstIssue));
      return;
    }

    next(error);
  }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureUser(req);
    const { id } = req.params;
    const workspace = ensureWorkspace(req);
    assertCapability(workspace.capabilities, 'canManageProjects', 'You cannot modify projects in this workspace');
    const payload = updateProjectSchema.parse(req.body);

    const existing = await prisma.project.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!existing) {
      throw new HttpError(404, 'Project not found');
    }

    const project = await prisma.project.update({
      where: { id },
      data: { ...payload },
    });

    res.status(200).json({ project });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Invalid project payload';
      next(new HttpError(400, firstIssue));
      return;
    }

    next(error);
  }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureUser(req);
    const { id } = req.params;

    const workspace = ensureWorkspace(req);
    assertCapability(workspace.capabilities, 'canManageProjects', 'You cannot delete projects in this workspace');

  const existing = await prisma.project.findFirst({ where: { id, workspaceId: workspace.id } });
    if (!existing) {
      throw new HttpError(404, 'Project not found');
    }

    await prisma.project.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    next(error);
  }
};
