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
}
