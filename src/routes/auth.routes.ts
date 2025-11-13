import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';
import { registerSchema, loginSchema } from '../domain/zod/auth.schema';

const router = Router();
const authController = new AuthController();

/**
 * POST /auth/register
 * Register a new user account
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * POST /auth/login
 * Authenticate and get JWT token
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
