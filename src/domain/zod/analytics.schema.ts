import { z } from 'zod';

/**
 * Date range query params validation
 */
export const dateRangeSchema = z.object({
	query: z.object({
		start: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
			.refine((date) => !isNaN(new Date(date).getTime()), 'Invalid date value'),
		end: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
			.refine((date) => !isNaN(new Date(date).getTime()), 'Invalid date value'),
	}),
});

export const optionalDateRangeSchema = z.object({
	query: z
		.object({
			start: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
				.refine(
					(date) => !isNaN(new Date(date).getTime()),
					'Invalid date value'
				)
				.optional(),
			end: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
				.refine(
					(date) => !isNaN(new Date(date).getTime()),
					'Invalid date value'
				)
				.optional(),
		})
		.optional()
		.default({}),
	params: z.object({
		id: z.string().regex(/^\d+$/, 'ID must be a number'),
	}),
});

/**
 * Utilization dashboard response
 */
export interface RoomUtilization {
	room_id: number;
	room_name: string;
	total_booked_hours: number;
	total_available_hours: number;
	utilization_percentage: number;
}

/**
 * Daily booking trends response
 */
export interface DailyBookingTrend {
	date: string;
	total_bookings: number;
	total_booked_hours: number;
}

/**
 * User history summary response
 */
export interface UserHistorySummary {
	user_id: number;
	total_bookings: number;
	total_canceled_bookings: number;
	total_booked_hours: number;
	first_booking_date: string | null;
	last_booking_date: string | null;
	rooms_used: RoomUsage[];
}

export interface RoomUsage {
	room_id: number;
	room_name: string;
	count: number;
}

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type OptionalDateRangeInput = z.infer<typeof optionalDateRangeSchema>;
