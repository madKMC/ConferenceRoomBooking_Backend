import { Request, Response, NextFunction } from 'express';
import { UsersService } from '../services/users.service';
import { HttpError, NotFoundError } from '../utils/httpErrors';

/**
 * Controller for user-related endpoints
 */
export class UsersController {
	private usersService: UsersService;

	constructor() {
		this.usersService = new UsersService();
	}

	/**
	 * GET /users/:id/bookings
	 * Get all bookings for a user
	 * Users can only view their own bookings, admins can view any user's bookings
	 */
	getUserBookings = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const userId = Number(req.params.id);

			// Check if user has permission to view this user's bookings
			if (req.user?.role !== 'admin' && userId !== req.user?.userId) {
				throw new HttpError(
					403,
					'FORBIDDEN',
					'You can only view your own bookings'
				);
			}

			const filters = {
				status: req.query.status as string | undefined,
				limit: req.query.limit ? Number(req.query.limit) : undefined,
				offset: req.query.offset ? Number(req.query.offset) : undefined,
			};

			const bookings = await this.usersService.getUserBookings(userId, filters);

			res.status(200).json({
				success: true,
				data: bookings,
			});
		} catch (error) {
			if (error instanceof NotFoundError) {
				next(new NotFoundError('User not found'));
			} else {
				next(error);
			}
		}
	};
}
