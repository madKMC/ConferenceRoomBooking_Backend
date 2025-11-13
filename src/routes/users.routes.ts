import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';
import { getUserBookingsSchema } from '../domain/zod/bookings.schema';

const router = Router();
const usersController = new UsersController();

// All user routes require authentication
router.use(authenticate);

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
