import type { Workspace, WorkspaceMembership } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma/client';
import { HttpError } from '../middlewares/errorMiddleware';
import { assertCapability, type WorkspaceType } from '../utils/workspacePermissions';
import { NotificationService } from '../services/notificationService';

const workspaceTypeEnum = z.enum(['personal', 'team']);
const workspaceRoleEnum = z.enum(['owner', 'admin', 'member', 'viewer']);

const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  type: workspaceTypeEnum.default('team'),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
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

const workspaceMembershipInclude = {
  workspace: true,
  invitedBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
    },
  },
} as const;

const workspaceMemberInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
      updatedAt: true,
      createdAt: true,
    },
  },
  invitedBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
    },
  },
} as const;

type MembershipWithWorkspace = WorkspaceMembership & {
  workspace: Workspace;
  invitedBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  } | null;
};

const serializeWorkspace = (membership: MembershipWithWorkspace) => ({
  id: membership.workspace.id,
  name: membership.workspace.name,
  type: (membership.workspace.type as WorkspaceType) ?? 'team',
  role: membership.role as WorkspaceMembership['role'],
  membershipId: membership.id,
  membershipCreatedAt: membership.createdAt,
  invitedBy: membership.invitedBy
    ? {
        id: membership.invitedBy.id,
        email: membership.invitedBy.email,
        firstName: membership.invitedBy.firstName,
        lastName: membership.invitedBy.lastName,
        username: membership.invitedBy.username,
      }
    : null,
  createdAt: membership.workspace.createdAt,
  updatedAt: membership.workspace.updatedAt,
});

type MembershipWithUser = WorkspaceMembership & {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  invitedBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  } | null;
};

const serializeWorkspaceMember = (membership: MembershipWithUser) => ({
  id: membership.user.id,
  membershipId: membership.id,
  email: membership.user.email,
  firstName: membership.user.firstName,
  lastName: membership.user.lastName,
  username: membership.user.username,
  role: String(membership.role ?? 'member').toUpperCase(),
  status: 'ACTIVE' as const,
  joinedAt: membership.createdAt,
  lastActiveAt: membership.user.updatedAt,
  invitedBy: membership.invitedBy
    ? {
        id: membership.invitedBy.id,
        email: membership.invitedBy.email,
        firstName: membership.invitedBy.firstName,
        lastName: membership.invitedBy.lastName,
        username: membership.invitedBy.username,
      }
    : null,
});

const inviteMemberSchema = z.object({
  email: z.string().email('Invite email must be valid'),
  role: workspaceRoleEnum.default('member'),
});

export const getWorkspaces = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req);
    console.info('[Workspaces] Fetching memberships', { userId: user.id });
    const memberships = await prisma.workspaceMembership.findMany({
      where: { userId: user.id },
      include: {
        ...workspaceMembershipInclude,
      },
      orderBy: {
        workspace: {
          createdAt: 'asc',
        },
      },
    });

    const workspaces = memberships.map((membership) => serializeWorkspace(membership as MembershipWithWorkspace));

    console.info('[Workspaces] Returning workspaces', {
      userId: user.id,
      count: workspaces.length,
      workspaceIds: workspaces.map((workspace) => workspace.id),
    });

    res.status(200).json({ workspaces });
  } catch (error: unknown) {
    console.error('[Workspaces] Failed to fetch memberships', {
      error,
      userId: req.user?.id,
    });
    next(error);
  }
};

export const createWorkspace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req);
    
    // Check if user has capability to create workspaces (from any workspace they're in)
    const userWorkspaces = await prisma.workspaceMembership.findMany({
      where: { userId: user.id },
      include: { workspace: true }
    });
    
    const canCreate = userWorkspaces.some(membership => {
      const role = membership.role as any;
      return role === 'owner' || role === 'admin';
    });
    
    if (!canCreate) {
      throw new HttpError(403, 'You do not have permission to create workspaces');
    }

    const { name, type } = createWorkspaceSchema.parse(req.body);
    if (type === 'personal') {
      throw new HttpError(400, 'Personal workspaces are created automatically and cannot be duplicated');
    }

    console.info('[Workspaces] Creating workspace', {
      name,
      type,
      userId: user.id,
    });

    const membership = await prisma.$transaction(async (tx) => {
      const createdWorkspace = await tx.workspace.create({
        data: {
          name,
          type,
          memberships: {
            create: {
              userId: user.id,
              role: 'owner',
            },
          },
        },
      });

      const ownerMembership = await tx.workspaceMembership.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: createdWorkspace.id,
          },
        },
        include: workspaceMembershipInclude,
      });

      if (!ownerMembership) {
        throw new HttpError(500, 'Failed to load workspace membership after creation');
      }

      return ownerMembership as MembershipWithWorkspace;
    });

    res.status(201).json({ workspace: serializeWorkspace(membership) });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Invalid workspace payload';
      next(new HttpError(400, firstIssue));
      return;
    }

    next(error);
  }
};

export const updateWorkspace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureUser(req);
    const workspaceContext = ensureWorkspace(req);
    assertCapability(
      workspaceContext.capabilities,
      'canManageMembers',
      'You cannot update this workspace',
    );

    const payload = updateWorkspaceSchema.parse(req.body);

    console.info('[Workspaces] Updating workspace', {
      workspaceId: workspaceContext.id,
      userId: req.user?.id,
    });

    await prisma.workspace.update({
      where: { id: workspaceContext.id },
      data: payload,
    });

    const membership = await prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user!.id,
          workspaceId: workspaceContext.id,
        },
      },
      include: workspaceMembershipInclude,
    });

    if (!membership) {
      throw new HttpError(500, 'Workspace membership context missing after update');
    }

    res.status(200).json({ workspace: serializeWorkspace(membership as MembershipWithWorkspace) });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Invalid workspace payload';
      next(new HttpError(400, firstIssue));
      return;
    }

    next(error);
  }
};

export const getWorkspaceMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureUser(req);
    const workspaceContext = ensureWorkspace(req);

    const memberships = await prisma.workspaceMembership.findMany({
      where: { workspaceId: workspaceContext.id },
      include: workspaceMemberInclude,
      orderBy: { createdAt: 'asc' },
    });

    const members = memberships.map((membership) =>
      serializeWorkspaceMember(membership as MembershipWithUser)
    );

    res.status(200).json({ members });
  } catch (error: unknown) {
    console.error('[Workspaces] Failed to fetch members', {
      error,
      workspaceId: req.workspace?.id,
      userId: req.user?.id,
    });
    next(error);
  }
};

export const inviteWorkspaceMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = ensureUser(req);
    const workspaceContext = ensureWorkspace(req);

    assertCapability(
      workspaceContext.capabilities,
      'canInviteMembers',
      'You do not have permission to invite members to this workspace',
    );

    if (workspaceContext.type === 'personal') {
      throw new HttpError(400, 'Personal workspaces do not support invitations');
    }

    const { email, role } = inviteMemberSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    if (role === 'owner') {
      throw new HttpError(400, 'Workspace ownership can only be transferred manually');
    }

    const invitee = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!invitee) {
      throw new HttpError(404, 'No TaskFlux account found for that email address');
    }

    if (invitee.id === user.id) {
      throw new HttpError(400, 'You are already a member of this workspace');
    }

    const existingMembership = await prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId: invitee.id,
          workspaceId: workspaceContext.id,
        },
      },
    });

    if (existingMembership) {
      throw new HttpError(409, 'That user is already in the workspace');
    }

    const createdMembership = await prisma.workspaceMembership.create({
      data: {
        userId: invitee.id,
        workspaceId: workspaceContext.id,
        role,
        invitedByUserId: user.id,
      },
      include: workspaceMemberInclude,
    });

    const inviterRecord = await prisma.user.findUnique({ where: { id: user.id } });
    const inviterName = inviterRecord
      ? [inviterRecord.firstName, inviterRecord.lastName].filter(Boolean).join(' ') || inviterRecord.username || inviterRecord.email
      : req.user?.email ?? 'A teammate';

    const notificationService = new NotificationService(prisma);
    await notificationService.notifyWorkspaceInvitation({
      workspaceId: workspaceContext.id,
      workspaceName: workspaceContext.name,
      inviterId: user.id,
      inviterName: inviterName ?? 'A teammate',
      inviteeId: invitee.id,
    });

    res.status(201).json({ member: serializeWorkspaceMember(createdMembership as MembershipWithUser) });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Invalid invitation payload';
      next(new HttpError(400, firstIssue));
      return;
    }

    next(error);
  }
};

export const deleteWorkspace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureUser(req);
    const workspaceContext = ensureWorkspace(req);

    if (workspaceContext.type === 'personal') {
      throw new HttpError(400, 'Personal workspaces cannot be deleted');
    }

    assertCapability(
      workspaceContext.capabilities,
      'canDeleteTeam',
      'You must be the workspace owner to delete this workspace',
    );

    console.info('[Workspaces] Deleting workspace', {
      workspaceId: workspaceContext.id,
      userId: req.user?.id,
    });

    await prisma.workspace.delete({ where: { id: workspaceContext.id } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error('[Workspaces] Failed to delete workspace', {
      error,
      workspaceId: req.workspace?.id,
      userId: req.user?.id,
    });
    next(error);
  }
};
