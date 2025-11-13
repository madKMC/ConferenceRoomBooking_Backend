import { Router } from 'express';
import { BookingsController } from '../controllers/bookings.controller';
import { validate } from '../middlewares/validate';
import { authenticate, requireRole } from '../middlewares/auth';
import {
	createBookingSchema,
	getBookingSchema,
	updateBookingSchema,
	deleteBookingSchema,
	getAllBookingsSchema,
} from '../domain/zod/bookings.schema';

const router = Router();
const bookingsController = new BookingsController();

// All booking routes require authentication
router.use(authenticate);

/**
 * GET /bookings
 * Get all bookings (admin only)
 */
router.get(
	'/',
	requireRole('admin'),
	validate(getAllBookingsSchema),
	bookingsController.getAllBookings
);

/**
 * POST /bookings
 * Create a new booking
 */
router.post(
	'/',
	validate(createBookingSchema),
	bookingsController.createBooking
);

/**
 * GET /bookings/:id
 * Get a booking by ID
 */
router.get(
	'/:id',
	validate(getBookingSchema),
	bookingsController.getBookingById
);

/**
 * PATCH /bookings/:id
 * Update a booking
 */
router.patch(
	'/:id',
	validate(updateBookingSchema),
	bookingsController.updateBooking
);

/**
 * DELETE /bookings/:id
 * Cancel a booking
 */
router.delete(
	'/:id',
	validate(deleteBookingSchema),
	bookingsController.deleteBooking
);

export default router;
