import { Router } from 'express';
import { BookingsController } from '../controllers/bookings.controller';
import { InvitationsController } from '../controllers/invitations.controller';
import { validate } from '../middlewares/validate';
import { authenticate, requireRole } from '../middlewares/auth';
import {
	createBookingSchema,
	getBookingSchema,
	updateBookingSchema,
	deleteBookingSchema,
	getAllBookingsSchema,
} from '../domain/zod/bookings.schema';
import {
	addInviteesSchema,
	removeInviteeSchema,
	respondToInvitationSchema,
} from '../domain/zod/invitations.schema';

const router = Router();
const bookingsController = new BookingsController();
const invitationsController = new InvitationsController();

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

/**
 * POST /bookings/:id/invitees
 * Add users to a booking (owner only)
 */
router.post(
	'/:id/invitees',
	validate(addInviteesSchema),
	invitationsController.addInvitees
);

/**
 * GET /bookings/:id/invitees
 * Get all invitees for a booking
 */
router.get('/:id/invitees', invitationsController.getInvitees);

/**
 * DELETE /bookings/:bookingId/invitees/:userId
 * Remove a user from a booking (owner only)
 */
router.delete(
	'/:bookingId/invitees/:userId',
	validate(removeInviteeSchema),
	invitationsController.removeInvitee
);

/**
 * PATCH /bookings/:id/invitation
 * Respond to a booking invitation
 */
router.patch(
	'/:id/invitation',
	validate(respondToInvitationSchema),
	invitationsController.respondToInvitation
);

export default router;
