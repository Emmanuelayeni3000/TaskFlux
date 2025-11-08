import type { NextFunction, Request, Response } from 'express';
import type { User, Workspace, WorkspaceMembership } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../prisma/client';
import { HttpError } from '../middlewares/errorMiddleware';
import { createAccessToken } from '../utils/token';
import { comparePassword, hashPassword } from '../utils/password';
import { generateUniqueUsername } from '../utils/username';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

const invitedBySelection = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  username: true,
} as const;

type MembershipWithRelations = WorkspaceMembership & {
  workspace: Workspace;
  invitedBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  } | null;
};

const serializeMembership = (membership: MembershipWithRelations) => ({
  id: membership.workspace.id,
  name: membership.workspace.name,
  type: membership.workspace.type,
  role: membership.role,
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

type SerializedWorkspaceMembership = ReturnType<typeof serializeMembership>;

const sortWorkspaces = (workspaces: SerializedWorkspaceMembership[]) => {
  return [...workspaces].sort((a, b) => {
    if (a.type === b.type) {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }

    return a.type === 'personal' ? -1 : 1;
  });
};

const ensureUserHasUsername = async (user: User) => {
  if (user.username) {
    return user;
  }

  const username = await generateUniqueUsername(prisma, {
    email: user.email,
    firstName: user.firstName,
  });

  return prisma.user.update({
    where: { id: user.id },
    data: { username },
  });
};

const fetchMemberships = async (userId: string): Promise<MembershipWithRelations[]> => {
  const memberships = await prisma.workspaceMembership.findMany({
    where: { userId },
    include: {
      workspace: true,
      invitedBy: {
        select: invitedBySelection,
      },
    },
    orderBy: { workspace: { createdAt: 'asc' } },
  });

  return memberships as MembershipWithRelations[];
};

const ensurePersonalWorkspaceMembership = async (
  user: User,
  memberships: MembershipWithRelations[],
): Promise<MembershipWithRelations[]> => {
  const hasPersonal = memberships.some((membership) => membership.workspace.type === 'personal');
  if (hasPersonal) {
    return memberships;
  }

  const personalBundle = await prisma.$transaction(async (tx) => {
    const createdWorkspace = await tx.workspace.create({
      data: {
        name: user.firstName ? `${user.firstName}'s workspace` : 'Personal workspace',
        type: 'personal',
        memberships: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
      },
      include: {
        memberships: true,
      },
    });

    const membershipRecord = createdWorkspace.memberships[0];
    const { memberships: _memberships, ...workspaceData } = createdWorkspace;

    return {
      workspace: workspaceData as Workspace,
      membership: membershipRecord,
    };
  });

  return [
    {
      ...personalBundle.membership,
      workspace: personalBundle.workspace,
      invitedBy: null,
    } as MembershipWithRelations,
    ...memberships,
  ];
};

const getSerializedWorkspaceMemberships = async (user: User) => {
  const memberships = await fetchMemberships(user.id);
  const withPersonal = await ensurePersonalWorkspaceMembership(user, memberships);
  const serialized = withPersonal.map((membership) => serializeMembership(membership));
  return sortWorkspaces(serialized);
};

const toUserPayload = (user: User) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(409, 'Account already exists for that email address');
    }

    const passwordHash = await hashPassword(password);

    const { user, workspace, membership } = await prisma.$transaction(async (tx) => {
      const username = await generateUniqueUsername(tx, { email, firstName });

      const createdUser = await tx.user.create({
        data: { email, password: passwordHash, firstName, lastName, username },
      });

      const workspaceName = firstName ? `${firstName}'s workspace` : 'Personal workspace';
      const personalWorkspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          type: 'personal',
          memberships: {
            create: {
              userId: createdUser.id,
              role: 'owner',
            },
          },
        },
        include: {
          memberships: true,
        },
      });

      const membershipRecord = personalWorkspace.memberships[0];
      const { memberships, ...workspaceData } = personalWorkspace;

      return { user: createdUser, workspace: workspaceData, membership: membershipRecord };
    });

    const token = createAccessToken({ userId: user.id, email: user.email });

    const workspacePayload = serializeMembership({
      ...membership,
      workspace,
      invitedBy: null,
    } as MembershipWithRelations);

    res.status(201).json({
      user: toUserPayload(user),
      token,
      workspaces: [workspacePayload],
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Invalid request payload';
      next(new HttpError(400, firstIssue));
      return;
    }

    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const userRecord = await prisma.user.findUnique({ where: { email } });
    if (!userRecord) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const isValid = await comparePassword(password, userRecord.password);
    if (!isValid) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const user = await ensureUserHasUsername(userRecord);

    const token = createAccessToken({ userId: user.id, email: user.email });
    const workspaces = await getSerializedWorkspaceMemberships(user);

    res.status(200).json({
      user: toUserPayload(user),
      token,
      workspaces,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Invalid request payload';
      next(new HttpError(400, firstIssue));
      return;
    }

    next(error);
  }
};

export const getSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError(401, 'Authentication required');
    }

    const userRecord = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!userRecord) {
      throw new HttpError(404, 'User not found');
    }

    const user = await ensureUserHasUsername(userRecord);
    const workspaces = await getSerializedWorkspaceMemberships(user);

    res.status(200).json({
      user: toUserPayload(user),
      workspaces,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Invalid request payload';
      next(new HttpError(400, firstIssue));
      return;
    }

    next(error);
  }
};
