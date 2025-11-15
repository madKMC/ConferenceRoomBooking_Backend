import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';
import { getUserBookingsSchema } from '../domain/zod/bookings.schema';
import { listUsersSchema } from '../domain/zod/invitations.schema';

const router = Router();
const usersController = new UsersController();

// All user routes require authentication
router.use(authenticate);

/**
 * GET /users
 * List all users with optional search and pagination
 */
router.get('/', validate(listUsersSchema), usersController.listUsers);

/**
 * GET /users/:id/bookings
 * Get all bookings for a specific user
 */
router.get(
	'/:id/bookings',
	validate(getUserBookingsSchema),
	usersController.getUserBookings
);

export default router;
