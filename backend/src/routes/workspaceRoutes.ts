import { Router } from 'express';

import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaces,
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
router.patch('/:workspaceId', requireWorkspaceByParam('workspaceId'), updateWorkspace);
router.delete('/:workspaceId', requireWorkspaceByParam('workspaceId'), deleteWorkspace);

export default router;
