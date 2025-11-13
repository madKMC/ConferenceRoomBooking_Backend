import { UsersRepository } from '../repositories/users.repo';
import { BookingWithRoom } from '../domain/zod/bookings.schema';
import { BookingsRepository } from '../repositories/bookings.repo';

/**
 * Service for user-related business logic
 */
export class UsersService {
	private usersRepo: UsersRepository;
	private bookingsRepo: BookingsRepository;

	constructor() {
		this.usersRepo = new UsersRepository();
		this.bookingsRepo = new BookingsRepository();
	}

	/**
	 * Get all bookings for a specific user
	 */
	async getUserBookings(
		userId: number,
		filters?: {
			status?: string;
			limit?: number;
			offset?: number;
		}
	): Promise<BookingWithRoom[]> {
		return this.bookingsRepo.findByUserId(userId, filters);
	}
}
