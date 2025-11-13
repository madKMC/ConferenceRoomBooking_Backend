import { Request, Response, NextFunction } from 'express';
import { BookingsService } from '../services/bookings.service';
import { HttpError } from '../utils/httpErrors';

/**
 * Controller for booking-related endpoints
 */
export class BookingsController {
	private bookingsService: BookingsService;

	constructor() {
		this.bookingsService = new BookingsService();
	}

	/**
	 * GET /bookings
	 * Get all bookings (admin only)
	 */
	getAllBookings = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const filters = {
				status: req.query.status as string | undefined,
				room_id: req.query.room_id ? Number(req.query.room_id) : undefined,
				user_id: req.query.user_id ? Number(req.query.user_id) : undefined,
				limit: req.query.limit ? Number(req.query.limit) : undefined,
				offset: req.query.offset ? Number(req.query.offset) : undefined,
			};

			const bookings = await this.bookingsService.getAllBookings(filters);

			res.status(200).json({
				success: true,
				data: bookings,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * POST /bookings
	 * Create a new booking
	 */
	createBooking = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const booking = await this.bookingsService.createBooking(req.body);

			res.status(201).json({
				success: true,
				data: booking,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * GET /bookings/:id
	 * Get a booking by ID
	 * Users can only view their own bookings, admins can view all
	 */
	getBookingById = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const bookingId = Number(req.params.id);
			const booking = await this.bookingsService.getBookingById(bookingId);

			// Check if user has permission to view this booking
			if (req.user?.role !== 'admin' && booking.user_id !== req.user?.userId) {
				throw new HttpError(
					403,
					'FORBIDDEN',
					'You can only view your own bookings'
				);
			}

			res.status(200).json({
				success: true,
				data: booking,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * PATCH /bookings/:id
	 * Update a booking
	 * Users can only update their own bookings, admins can update all
	 */
	updateBooking = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const bookingId = Number(req.params.id);

			// First get the booking to check ownership
			const existingBooking = await this.bookingsService.getBookingById(
				bookingId
			);

			// Check if user has permission to update this booking
			if (
				req.user?.role !== 'admin' &&
				existingBooking.user_id !== req.user?.userId
			) {
				throw new HttpError(
					403,
					'FORBIDDEN',
					'You can only update your own bookings'
				);
			}

			const booking = await this.bookingsService.updateBooking(
				bookingId,
				req.body
			);

			res.status(200).json({
				success: true,
				data: booking,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * DELETE /bookings/:id
	 * Cancel a booking (soft delete)
	 * Users can only cancel their own bookings, admins can cancel all
	 */
	deleteBooking = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const bookingId = Number(req.params.id);

			// First get the booking to check ownership
			const existingBooking = await this.bookingsService.getBookingById(
				bookingId
			);

			// Check if user has permission to cancel this booking
			if (
				req.user?.role !== 'admin' &&
				existingBooking.user_id !== req.user?.userId
			) {
				throw new HttpError(
					403,
					'FORBIDDEN',
					'You can only cancel your own bookings'
				);
			}

			await this.bookingsService.cancelBooking(bookingId);

			res.status(200).json({
				success: true,
				message: 'Booking cancelled successfully',
			});
		} catch (error) {
			next(error);
		}
	};
}
