import { Router } from 'express';

import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaces,
  getWorkspaceMembers,
  inviteWorkspaceMember,
  updateWorkspace,
} from '../controllers/workspaceController';
import { requireAuth } from '../middlewares/authMiddleware';
import {
  requireWorkspaceByParam,
  requireWorkspaceContext,
} from '../middlewares/workspaceMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', getWorkspaces);
router.post('/', createWorkspace);
router.get('/:workspaceId/members', requireWorkspaceByParam('workspaceId'), getWorkspaceMembers);
router.post('/:workspaceId/members', requireWorkspaceByParam('workspaceId'), inviteWorkspaceMember);
router.patch('/:workspaceId', requireWorkspaceByParam('workspaceId'), updateWorkspace);
router.delete('/:workspaceId', requireWorkspaceByParam('workspaceId'), deleteWorkspace);

export default router;
