import { Router } from 'express';
import { RoomsController } from '../controllers/rooms.controller';
import { validate } from '../middlewares/validate';
import { authenticate, requireAdmin } from '../middlewares/auth';
import {
	getRoomsSchema,
	getRoomSchema,
	getRoomAvailabilitySchema,
	getRoomBookingsSchema,
	createRoomSchema,
	updateRoomSchema,
	deleteRoomSchema,
} from '../domain/zod/rooms.schema';

const router = Router();
const roomsController = new RoomsController();

// All room routes require authentication
router.use(authenticate);

/**
 * GET /rooms
 * List all rooms with their amenities
 */
router.get('/', validate(getRoomsSchema), roomsController.getAllRooms);

/**
 * POST /rooms
 * Create a new room (admin only)
 */
router.post(
	'/',
	requireAdmin,
	validate(createRoomSchema),
	roomsController.createRoom
);

/**
 * GET /rooms/:id/bookings
 * Get bookings for a specific room on a specific date
 * NOTE: This must come BEFORE /rooms/:id to prevent :id from matching "bookings"
 */
router.get(
	'/:id/bookings',
	validate(getRoomBookingsSchema),
	roomsController.getRoomBookings
);

/**
 * GET /rooms/:id/availability
 * Check room availability for a specific date
 * NOTE: This must come BEFORE /rooms/:id to prevent :id from matching "availability"
 */
router.get(
	'/:id/availability',
	validate(getRoomAvailabilitySchema),
	roomsController.getRoomAvailability
);

/**
 * GET /rooms/:id
 * Get a single room by ID
 */
router.get('/:id', validate(getRoomSchema), roomsController.getRoomById);

/**
 * PATCH /rooms/:id
 * Update a room (admin only)
 */
router.patch(
	'/:id',
	requireAdmin,
	validate(updateRoomSchema),
	roomsController.updateRoom
);

/**
 * DELETE /rooms/:id
 * Delete a room (admin only, soft delete)
 */
router.delete(
	'/:id',
	requireAdmin,
	validate(deleteRoomSchema),
	roomsController.deleteRoom
);

export default router;
