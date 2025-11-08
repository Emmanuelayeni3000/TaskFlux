import { Router } from 'express';

import { createProject, deleteProject, getProjects, updateProject } from '../controllers/projectController';
import { requireAuth } from '../middlewares/authMiddleware';
import { requireWorkspaceContext } from '../middlewares/workspaceMiddleware';

const router = Router();

router.use(requireAuth);
router.use(requireWorkspaceContext);

router.get('/', getProjects);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
