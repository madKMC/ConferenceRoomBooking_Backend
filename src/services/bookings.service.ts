import { withTransaction } from '../config/db';
import { BookingsRepository } from '../repositories/bookings.repo';
import { RoomsRepository } from '../repositories/rooms.repo';
import { UsersRepository } from '../repositories/users.repo';
import {
	Booking,
	CreateBookingInput,
	UpdateBookingInput,
	BookingWithRoom,
} from '../domain/zod/bookings.schema';
import {
	NotFoundError,
	ConflictError,
	BadRequestError,
} from '../utils/httpErrors';
import { validateBusinessHours, validateDuration } from '../utils/time';

/**
 * Service for booking-related business logic
 * Handles transactions, validation, and concurrency control
 */
export class BookingsService {
	private bookingsRepo: BookingsRepository;
	private roomsRepo: RoomsRepository;
	private usersRepo: UsersRepository;

	constructor() {
		this.bookingsRepo = new BookingsRepository();
		this.roomsRepo = new RoomsRepository();
		this.usersRepo = new UsersRepository();
	}

	/**
	 * Create a new booking with overlap checking
	 * Uses transaction with SELECT ... FOR UPDATE for concurrency control
	 */
	async createBooking(data: CreateBookingInput): Promise<Booking> {
		// Parse and validate dates
		const startTime = new Date(data.start_time);
		const endTime = new Date(data.end_time);

		// Business rule validations
		this.validateBookingTimes(startTime, endTime);

		// Verify room exists
		const room = await this.roomsRepo.findById(data.room_id);
		if (!room) {
			throw new NotFoundError('Room not found');
		}

		// Verify user exists
		const user = await this.usersRepo.findById(data.user_id);
		if (!user) {
			throw new NotFoundError('User not found');
		}

		// Use transaction for atomicity and locking
		return withTransaction(async (connection) => {
			// Check for overlapping bookings with row-level locking
			// This acquires next-key locks on the index, preventing phantom reads
			const overlapCount = await this.bookingsRepo.findOverlapping(
				data.room_id,
				data.start_time,
				data.end_time,
				null,
				connection
			);

			if (overlapCount > 0) {
				throw new ConflictError(
					'Booking conflict: Room is already booked for the selected time period'
				);
			}

			// Create the booking
			return this.bookingsRepo.create(data, connection);
		});
	}

	/**
	 * Get a booking by ID
	 */
	async getBookingById(bookingId: number): Promise<Booking> {
		const booking = await this.bookingsRepo.findById(bookingId);

		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		return booking;
	}

	/**
	 * Update a booking with validation and overlap checking
	 */
	async updateBooking(
		bookingId: number,
		data: UpdateBookingInput
	): Promise<Booking> {
		return withTransaction(async (connection) => {
			// Get current booking
			const currentBooking = await this.bookingsRepo.findById(
				bookingId,
				connection
			);

			if (!currentBooking) {
				throw new NotFoundError('Booking not found');
			}

			// Don't allow updating cancelled bookings
			if (currentBooking.status === 'cancelled') {
				throw new BadRequestError('Cannot update a cancelled booking');
			}

			// Determine final values after update
			const finalRoomId = data.room_id ?? currentBooking.room_id;
			const finalStartTime = data.start_time
				? new Date(data.start_time)
				: currentBooking.start_time;
			const finalEndTime = data.end_time
				? new Date(data.end_time)
				: currentBooking.end_time;
			const finalStatus = data.status ?? currentBooking.status;

			// Validate times if they're being changed
			if (data.start_time || data.end_time) {
				this.validateBookingTimes(finalStartTime, finalEndTime);
			}

			// Check for room change
			if (data.room_id && data.room_id !== currentBooking.room_id) {
				const room = await this.roomsRepo.findById(data.room_id);
				if (!room) {
					throw new NotFoundError('Room not found');
				}
			}

			// Check for overlaps if time/room changed or status is confirmed/pending
			const needsOverlapCheck =
				data.room_id !== undefined ||
				data.start_time !== undefined ||
				data.end_time !== undefined ||
				finalStatus === 'confirmed' ||
				finalStatus === 'pending';

			if (needsOverlapCheck) {
				const overlapCount = await this.bookingsRepo.findOverlapping(
					finalRoomId,
					finalStartTime.toISOString(),
					finalEndTime.toISOString(),
					bookingId,
					connection
				);

				if (overlapCount > 0) {
					throw new ConflictError(
						'Booking conflict: Room is already booked for the selected time period'
					);
				}
			}

			// Perform update
			const updated = await this.bookingsRepo.update(
				bookingId,
				data,
				connection
			);

			if (!updated) {
				throw new NotFoundError('Booking not found after update');
			}

			return updated;
		});
	}

	/**
	 * Cancel (soft delete) a booking
	 */
	async cancelBooking(bookingId: number): Promise<void> {
		return withTransaction(async (connection) => {
			const booking = await this.bookingsRepo.findById(bookingId, connection);

			if (!booking) {
				throw new NotFoundError('Booking not found');
			}

			// Idempotent: if already cancelled, just return success
			if (booking.status === 'cancelled') {
				return;
			}

			const cancelled = await this.bookingsRepo.cancel(bookingId, connection);

			if (!cancelled) {
				throw new NotFoundError('Booking not found');
			}
		});
	}

	/**
	 * Get all bookings for a user
	 */
	async getUserBookings(
		userId: number,
		filters?: {
			status?: string;
			limit?: number;
			offset?: number;
		}
	): Promise<BookingWithRoom[]> {
		// Verify user exists
		const user = await this.usersRepo.findById(userId);
		if (!user) {
			throw new NotFoundError('User not found');
		}

		return this.bookingsRepo.findByUserId(userId, filters);
	}

	/**
	 * Get all bookings (admin only)
	 */
	async getAllBookings(filters?: {
		status?: string;
		room_id?: number;
		user_id?: number;
		limit?: number;
		offset?: number;
	}): Promise<BookingWithRoom[]> {
		return this.bookingsRepo.findAll(filters);
	}

	/**
	 * Validate booking times according to business rules
	 */
	private validateBookingTimes(startTime: Date, endTime: Date): void {
		// Check that end is after start
		if (endTime <= startTime) {
			throw new BadRequestError('End time must be after start time');
		}

		// Check business hours (9 AM - 5 PM)
		if (!validateBusinessHours(startTime, endTime)) {
			throw new BadRequestError(
				'Bookings must be within business hours (09:00 - 17:00)'
			);
		}

		// Check duration (30 min - 4 hours)
		if (!validateDuration(startTime, endTime)) {
			throw new BadRequestError(
				'Booking duration must be between 30 minutes and 4 hours'
			);
		}
	}
}
