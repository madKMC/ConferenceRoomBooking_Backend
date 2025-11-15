import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';

/**
 * Controller for analytics endpoints (admin-only)
 */
export class AnalyticsController {
	private analyticsService: AnalyticsService;

	constructor() {
		this.analyticsService = new AnalyticsService();
	}

	/**
	 * GET /analytics/utilization
	 * Get room utilization dashboard
	 */
	getUtilizationDashboard = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const { start, end } = req.query;

			const data = await this.analyticsService.getUtilizationDashboard(
				start as string,
				end as string
			);

			res.status(200).json({
				success: true,
				data,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * GET /analytics/bookings/daily
	 * Get daily booking trends
	 */
	getDailyBookingTrends = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const { start, end } = req.query;

			const data = await this.analyticsService.getDailyBookingTrends(
				start as string,
				end as string
			);

			res.status(200).json({
				success: true,
				data,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * GET /analytics/users/:id/summary
	 * Get user booking history summary
	 */
	getUserHistorySummary = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const userId = Number(req.params.id);
			const { start, end } = req.query;

			const data = await this.analyticsService.getUserHistorySummary(
				userId,
				start as string | undefined,
				end as string | undefined
			);

			res.status(200).json({
				success: true,
				data,
			});
		} catch (error) {
			next(error);
		}
	};
}
