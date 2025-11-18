import { Router } from 'express';

import { getSession, login, register } from '../controllers/authController';
import { requireAuth } from '../middlewares/authMiddleware';
import { loginRateLimit } from '../middlewares/rateLimitMiddleware';

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Account created successfully.
 *       '400':
 *         description: Invalid payload.
 *       '409':
 *         description: Email already registered.
 */
router.post('/register', register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Authenticate and obtain a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Login successful.
 *       '400':
 *         description: Invalid payload.
 *       '401':
 *         description: Invalid credentials.
 */
router.post('/login', loginRateLimit, login);

/**
 * @openapi
 * /api/auth/session:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Retrieve the authenticated user's profile and workspace memberships
 *     responses:
 *       '200':
 *         description: Session details returned.
 *       '401':
 *         description: Authentication required.
 */
router.get('/session', requireAuth, getSession);

export default router;
