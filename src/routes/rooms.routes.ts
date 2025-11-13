import { Router } from 'express';
import { RoomsController } from '../controllers/rooms.controller';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';
import {
	getRoomsSchema,
	getRoomAvailabilitySchema,
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
 * GET /rooms/:id/availability
 * Check room availability for a specific date
 */
router.get(
	'/:id/availability',
	validate(getRoomAvailabilitySchema),
	roomsController.getRoomAvailability
);

export default router;
