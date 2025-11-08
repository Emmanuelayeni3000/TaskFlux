import { HttpError } from '../middlewares/errorMiddleware';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type WorkspaceType = 'personal' | 'team';

export type WorkspaceCapabilities = {
  canViewWorkspace: boolean;
  canManageBilling: boolean;
  canManageMembers: boolean;
  canPromoteAdmins: boolean;
  canDeleteTeam: boolean;
  canManageProjects: boolean;
  canManageTasks: boolean;
  canCreateTasks: boolean;
  canViewAnalytics: boolean;
  canInviteMembers: boolean;
  canManageTags: boolean;
  canComment: boolean;
  canCreateWorkspaces: boolean;
};

export type CapabilityOverrides = {
  allowMemberTaskCreation?: boolean;
  allowMemberInvites?: boolean;
};

const ROLE_CAPABILITIES: Record<WorkspaceRole, WorkspaceCapabilities> = {
  owner: {
    canViewWorkspace: true,
    canManageBilling: true,
    canManageMembers: true,
    canPromoteAdmins: true,
    canDeleteTeam: true,
    canManageProjects: true,
    canManageTasks: true,
    canCreateTasks: true,
    canViewAnalytics: true,
    canInviteMembers: true,
    canManageTags: true,
    canComment: true,
    canCreateWorkspaces: true,
  },
  admin: {
    canViewWorkspace: true,
    canManageBilling: false,
    canManageMembers: true,
    canPromoteAdmins: true,
    canDeleteTeam: false,
    canManageProjects: true,
    canManageTasks: true,
    canCreateTasks: true,
    canViewAnalytics: true,
    canInviteMembers: true,
    canManageTags: true,
    canComment: true,
    canCreateWorkspaces: true,
  },
  member: {
    canViewWorkspace: true,
    canManageBilling: false,
    canManageMembers: false,
    canPromoteAdmins: false,
    canDeleteTeam: false,
    canManageProjects: false,
    canManageTasks: true,
    canCreateTasks: true,
    canViewAnalytics: false,
    canInviteMembers: false,
    canManageTags: false,
    canComment: true,
    canCreateWorkspaces: true,
  },
  viewer: {
    canViewWorkspace: true,
    canManageBilling: false,
    canManageMembers: false,
    canPromoteAdmins: false,
    canDeleteTeam: false,
    canManageProjects: false,
    canManageTasks: false,
    canCreateTasks: false,
    canViewAnalytics: false,
    canInviteMembers: false,
    canManageTags: false,
    canComment: false,
    canCreateWorkspaces: false,
  },
};

export const CAPABILITY_KEYS = Object.keys(ROLE_CAPABILITIES.owner) as Array<keyof WorkspaceCapabilities>;

export function getWorkspaceCapabilities(
  role: WorkspaceRole,
  overrides: CapabilityOverrides = {},
): WorkspaceCapabilities {
  const base = ROLE_CAPABILITIES[role] ?? ROLE_CAPABILITIES.member;
  if (role !== 'member') {
    return base;
  }

  const { allowMemberTaskCreation = true, allowMemberInvites = false } = overrides;
  return {
    ...base,
    canCreateTasks: base.canCreateTasks && allowMemberTaskCreation,
    canManageTasks: base.canManageTasks && allowMemberTaskCreation,
    canInviteMembers: base.canInviteMembers || allowMemberInvites,
  };
}

export function assertCapability(
  capabilities: WorkspaceCapabilities,
  capability: keyof WorkspaceCapabilities,
  message?: string,
): void {
  if (!capabilities[capability]) {
    throw new HttpError(403, message ?? 'Insufficient permissions for this action');
  }
}
