import { Router } from 'express';

import { createMessage, getMessages } from '../controllers/chatController';
import { requireAuth } from '../middlewares/authMiddleware';
import { requireWorkspaceByParam } from '../middlewares/workspaceMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/:workspaceId/chat/messages', requireWorkspaceByParam('workspaceId'), getMessages);
router.post('/:workspaceId/chat/messages', requireWorkspaceByParam('workspaceId'), createMessage);

export default router;
