import type { User } from '@prisma/client';
import type {
  WorkspaceCapabilities,
  WorkspaceRole,
  WorkspaceType,
} from '../utils/workspacePermissions';

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, 'id' | 'email'>;
      workspace?: {
        id: string;
        name: string;
        type: WorkspaceType;
        role: WorkspaceRole;
        capabilities: WorkspaceCapabilities;
      };
    }
  }
}

export {};
