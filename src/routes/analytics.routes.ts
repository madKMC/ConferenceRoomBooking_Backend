import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
	dateRangeSchema,
	optionalDateRangeSchema,
} from '../domain/zod/analytics.schema';

const router = Router();
const analyticsController = new AnalyticsController();

/**
 * All analytics routes require authentication and admin role
 */

/**
 * GET /analytics/utilization
 * Get room utilization dashboard
 * Query params: start (YYYY-MM-DD), end (YYYY-MM-DD)
 */
router.get(
	'/utilization',
	authenticate,
	requireRole('admin'),
	validate(dateRangeSchema),
	analyticsController.getUtilizationDashboard
);

/**
 * GET /analytics/bookings/daily
 * Get daily booking trends
 * Query params: start (YYYY-MM-DD), end (YYYY-MM-DD)
 */
router.get(
	'/bookings/daily',
	authenticate,
	requireRole('admin'),
	validate(dateRangeSchema),
	analyticsController.getDailyBookingTrends
);

/**
 * GET /analytics/users/:id/summary
 * Get user booking history summary
 * Query params (optional): start (YYYY-MM-DD), end (YYYY-MM-DD)
 */
router.get(
	'/users/:id/summary',
	authenticate,
	requireRole('admin'),
	validate(optionalDateRangeSchema),
	analyticsController.getUserHistorySummary
);

export default router;
