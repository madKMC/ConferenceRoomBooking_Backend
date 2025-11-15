import { AnalyticsRepository } from '../repositories/analytics.repo';
import { UsersRepository } from '../repositories/users.repo';
import {
	RoomUtilization,
	DailyBookingTrend,
	UserHistorySummary,
} from '../domain/zod/analytics.schema';
import { BadRequestError, NotFoundError } from '../utils/httpErrors';

/**
 * Service for analytics business logic
 */
export class AnalyticsService {
	private analyticsRepo: AnalyticsRepository;
	private usersRepo: UsersRepository;

	constructor() {
		this.analyticsRepo = new AnalyticsRepository();
		this.usersRepo = new UsersRepository();
	}

	/**
	 * Get room utilization dashboard data
	 */
	async getUtilizationDashboard(
		startDate: string,
		endDate: string
	): Promise<RoomUtilization[]> {
		// Validate date range
		this.validateDateRange(startDate, endDate);

		return this.analyticsRepo.getRoomUtilization(startDate, endDate);
	}

	/**
	 * Get daily booking trends
	 */
	async getDailyBookingTrends(
		startDate: string,
		endDate: string
	): Promise<DailyBookingTrend[]> {
		// Validate date range
		this.validateDateRange(startDate, endDate);

		return this.analyticsRepo.getDailyBookingTrends(startDate, endDate);
	}

	/**
	 * Get user booking history summary
	 */
	async getUserHistorySummary(
		userId: number,
		startDate?: string,
		endDate?: string
	): Promise<UserHistorySummary> {
		// Verify user exists
		const user = await this.usersRepo.findById(userId);
		if (!user) {
			throw new NotFoundError('User not found');
		}

		// Validate date range if provided
		if (startDate && endDate) {
			this.validateDateRange(startDate, endDate);
		} else if (startDate || endDate) {
			throw new BadRequestError(
				'Both start and end dates must be provided together'
			);
		}

		return this.analyticsRepo.getUserHistorySummary(userId, startDate, endDate);
	}

	/**
	 * Validate that start date is before or equal to end date
	 */
	private validateDateRange(startDate: string, endDate: string): void {
		const start = new Date(startDate);
		const end = new Date(endDate);

		if (start > end) {
			throw new BadRequestError(
				'Start date must be before or equal to end date'
			);
		}
	}
}
