import type { NextFunction, Request, Response } from 'express';

import { prisma } from '../prisma/client';
import { HttpError } from './errorMiddleware';
import {
  getWorkspaceCapabilities,
  type WorkspaceRole,
  type WorkspaceType,
} from '../utils/workspacePermissions';

export const WORKSPACE_HEADER_KEY = 'x-workspace-id';
export const WORKSPACE_QUERY_KEY = 'workspaceId';

type MembershipWithWorkspace = {
  workspaceId: string;
  role: string;
  workspace: {
    id: string;
    name: string;
    type: string;
  };
};

const WORKSPACE_ROLES: WorkspaceRole[] = ['owner', 'admin', 'member', 'viewer'];
const WORKSPACE_TYPES: WorkspaceType[] = ['personal', 'team'];

const toWorkspaceRole = (role: string): WorkspaceRole => {
  if (WORKSPACE_ROLES.includes(role as WorkspaceRole)) {
    return role as WorkspaceRole;
  }
  return 'member';
};

const toWorkspaceType = (type: string): WorkspaceType => {
  if (WORKSPACE_TYPES.includes(type as WorkspaceType)) {
    return type as WorkspaceType;
  }
  return 'team';
};

const extractWorkspaceId = (req: Request): string | undefined => {
  const headerValue = req.headers[WORKSPACE_HEADER_KEY];
  if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
    return headerValue.trim();
  }

  const queryValue = req.query[WORKSPACE_QUERY_KEY];
  if (typeof queryValue === 'string' && queryValue.trim().length > 0) {
    return queryValue.trim();
  }

  return undefined;
};

const applyWorkspaceContext = (req: Request, membership: MembershipWithWorkspace) => {
  const role = toWorkspaceRole(membership.role);
  const type = toWorkspaceType(membership.workspace.type);

  req.workspace = {
    id: membership.workspaceId,
    name: membership.workspace.name,
    type,
    role,
    capabilities: getWorkspaceCapabilities(role),
  };
};

const loadWorkspaceMembership = async (userId: string, workspaceId: string): Promise<MembershipWithWorkspace> => {
  const membership = await prisma.workspaceMembership.findFirst({
    where: {
      userId,
      workspaceId,
    },
    include: {
      workspace: true,
    },
  });

  if (!membership) {
    throw new HttpError(403, 'You do not have access to this workspace');
  }

  return {
    workspaceId: membership.workspaceId,
    role: membership.role,
    workspace: {
      id: membership.workspace.id,
      name: membership.workspace.name,
      type: membership.workspace.type,
    },
  };
};

export const requireWorkspaceContext = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError(401, 'Authentication required');
    }

    const workspaceId = extractWorkspaceId(req);
    if (!workspaceId) {
      throw new HttpError(400, 'Workspace identifier missing from request');
    }

    const membership = await loadWorkspaceMembership(req.user.id, workspaceId);
    applyWorkspaceContext(req, membership);
    next();
  } catch (error: unknown) {
    next(error);
  }
};

export const requireWorkspaceByParam = (paramName = 'workspaceId') =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, 'Authentication required');
      }

      const workspaceId = req.params[paramName];
      if (!workspaceId || workspaceId.trim().length === 0) {
        throw new HttpError(400, 'Workspace identifier missing from route');
      }

      const membership = await loadWorkspaceMembership(req.user.id, workspaceId);
      applyWorkspaceContext(req, membership);
      next();
    } catch (error: unknown) {
      next(error);
    }
  };
