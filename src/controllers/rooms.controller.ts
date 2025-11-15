import { Request, Response, NextFunction } from 'express';
import { RoomsService } from '../services/rooms.service';

/**
 * Controller for room-related endpoints
 */
export class RoomsController {
	private roomsService: RoomsService;

	constructor() {
		this.roomsService = new RoomsService();
	}

	/**
	 * GET /rooms
	 * List all rooms with their amenities
	 */
	getAllRooms = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const filters = {
				capacity: req.query.capacity ? Number(req.query.capacity) : undefined,
				floor: req.query.floor ? Number(req.query.floor) : undefined,
				limit: req.query.limit ? Number(req.query.limit) : undefined,
				offset: req.query.offset ? Number(req.query.offset) : undefined,
			};

			const rooms = await this.roomsService.getAllRooms(filters);

			res.status(200).json({
				success: true,
				data: rooms,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * GET /rooms/:id/availability
	 * Check room availability for a specific date
	 */
	getRoomAvailability = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const roomId = Number(req.params.id);
			const date = req.query.date as string;

			const availability = await this.roomsService.getRoomAvailability(
				roomId,
				date
			);

			res.status(200).json({
				success: true,
				data: availability,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * GET /rooms/:id
	 * Get a single room by ID
	 */
	getRoomById = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const roomId = Number(req.params.id);
			const room = await this.roomsService.getRoomById(roomId);

			res.status(200).json({
				success: true,
				data: room,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * POST /rooms
	 * Create a new room (admin only)
	 */
	createRoom = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const room = await this.roomsService.createRoom(req.body);

			res.status(201).json({
				success: true,
				data: room,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * PATCH /rooms/:id
	 * Update a room (admin only)
	 */
	updateRoom = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const roomId = Number(req.params.id);
			const room = await this.roomsService.updateRoom(roomId, req.body);

			res.status(200).json({
				success: true,
				data: room,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * GET /rooms/:id/bookings
	 * Get bookings for a specific room on a specific date
	 */
	getRoomBookings = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const roomId = Number(req.params.id);
			const date = req.query.date as string;

			const bookings = await this.roomsService.getRoomBookings(roomId, date);

			res.status(200).json({
				success: true,
				data: bookings,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * DELETE /rooms/:id
	 * Delete a room (admin only, soft delete)
	 */
	deleteRoom = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const roomId = Number(req.params.id);
			await this.roomsService.deleteRoom(roomId);

			res.status(200).json({
				success: true,
				data: {
					message: 'Room deleted successfully',
				},
			});
		} catch (error) {
			next(error);
		}
	};
}
