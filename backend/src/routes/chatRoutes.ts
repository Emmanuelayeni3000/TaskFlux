import { Router } from 'express';

import { chatAttachmentUpload, createMessage, getMessages, uploadAttachment } from '../controllers/chatController';
import { requireAuth } from '../middlewares/authMiddleware';
import { requireWorkspaceByParam } from '../middlewares/workspaceMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/:workspaceId/chat/messages', requireWorkspaceByParam('workspaceId'), getMessages);
router.post('/:workspaceId/chat/messages', requireWorkspaceByParam('workspaceId'), createMessage);
router.post(
	'/:workspaceId/chat/uploads',
	requireWorkspaceByParam('workspaceId'),
	chatAttachmentUpload,
	uploadAttachment,
);

export default router;
