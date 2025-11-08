import { Router } from 'express';

import { createTask, deleteTask, getTasks, updateTask } from '../controllers/taskController';
import { requireAuth } from '../middlewares/authMiddleware';
import { requireWorkspaceContext } from '../middlewares/workspaceMiddleware';

const router = Router();

router.use(requireAuth);
router.use(requireWorkspaceContext);

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Fetch tasks for the authenticated user.
 *     responses:
 *       '200':
 *         description: List of tasks returned.
 *   post:
 *     tags:
 *       - Tasks
 *     summary: Create a task for the authenticated user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskInput'
 *     responses:
 *       '201':
 *         description: Task created successfully.
 *       '400':
 *         description: Invalid task payload.
 */
router.get('/', getTasks);
router.post('/', createTask);

/**
 * @openapi
 * /api/tasks/{id}:
 *   put:
 *     tags:
 *       - Tasks
 *     summary: Update an existing task.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskUpdate'
 *     responses:
 *       '200':
 *         description: Task updated successfully.
 *       '400':
 *         description: Invalid task payload.
 *       '404':
 *         description: Task not found.
 *   delete:
 *     tags:
 *       - Tasks
 *     summary: Delete a task by id.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '204':
 *         description: Task deleted successfully.
 *       '404':
 *         description: Task not found.
 */
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
