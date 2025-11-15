import { RowDataPacket } from 'mysql2/promise';
import { query } from '../config/db';
import {
	RoomUtilization,
	DailyBookingTrend,
	UserHistorySummary,
	RoomUsage,
} from '../domain/zod/analytics.schema';

/**
 * Repository for analytics-related database operations
 */
export class AnalyticsRepository {
	/**
	 * Get room utilization data for a date range
	 * Calculates booked hours vs available hours within business hours (09:00-17:00)
	 */
	async getRoomUtilization(
		startDate: string,
		endDate: string
	): Promise<RoomUtilization[]> {
		const sql = `
			SELECT 
				r.id as room_id,
				r.name as room_name,
				COALESCE(SUM(
					CASE
						-- Calculate overlapping hours between booking and business hours (09:00-17:00)
						WHEN b.start_time < DATE_ADD(DATE(b.start_time), INTERVAL 9 HOUR)
							THEN TIMESTAMPDIFF(HOUR, 
								DATE_ADD(DATE(b.start_time), INTERVAL 9 HOUR),
								LEAST(b.end_time, DATE_ADD(DATE(b.start_time), INTERVAL 17 HOUR))
							)
						WHEN b.end_time > DATE_ADD(DATE(b.start_time), INTERVAL 17 HOUR)
							THEN TIMESTAMPDIFF(HOUR,
								b.start_time,
								DATE_ADD(DATE(b.start_time), INTERVAL 17 HOUR)
							)
						ELSE TIMESTAMPDIFF(HOUR, b.start_time, b.end_time)
					END
				), 0) as total_booked_hours
			FROM rooms r
			LEFT JOIN bookings b ON r.id = b.room_id
				AND DATE(b.start_time) BETWEEN ? AND ?
				AND b.status IN ('confirmed', 'completed')
			GROUP BY r.id, r.name
			ORDER BY r.id
		`;

		interface UtilizationRow extends RowDataPacket {
			room_id: number;
			room_name: string;
			total_booked_hours: number;
		}

		const rows = await query<UtilizationRow>(sql, [startDate, endDate]);

		// Calculate total available hours: 8 business hours per day * number of days
		const start = new Date(startDate);
		const end = new Date(endDate);
		const daysDiff =
			Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
		const totalAvailableHours = daysDiff * 8; // 8 hours per business day (09:00-17:00)

		return rows.map((row: UtilizationRow) => ({
			room_id: row.room_id,
			room_name: row.room_name,
			total_booked_hours: Number(row.total_booked_hours),
			total_available_hours: totalAvailableHours,
			utilization_percentage:
				totalAvailableHours > 0
					? Number(
							(
								(Number(row.total_booked_hours) / totalAvailableHours) *
								100
							).toFixed(2)
					  )
					: 0,
		}));
	}

	/**
	 * Get daily booking trends for a date range
	 */
	async getDailyBookingTrends(
		startDate: string,
		endDate: string
	): Promise<DailyBookingTrend[]> {
		const sql = `
			SELECT 
				DATE(start_time) as date,
				COUNT(*) as total_bookings,
				SUM(TIMESTAMPDIFF(HOUR, start_time, end_time)) as total_booked_hours
			FROM bookings
			WHERE DATE(start_time) BETWEEN ? AND ?
				AND status IN ('confirmed', 'completed')
			GROUP BY DATE(start_time)
			ORDER BY date ASC
		`;

		interface TrendRow extends RowDataPacket {
			date: Date;
			total_bookings: number;
			total_booked_hours: number;
		}

		const rows = await query<TrendRow>(sql, [startDate, endDate]);

		return rows.map((row: TrendRow) => ({
			date: row.date.toISOString().split('T')[0],
			total_bookings: Number(row.total_bookings),
			total_booked_hours: Number(row.total_booked_hours || 0),
		}));
	}

	/**
	 * Get booking history summary for a specific user
	 */
	async getUserHistorySummary(
		userId: number,
		startDate?: string,
		endDate?: string
	): Promise<UserHistorySummary> {
		// Build WHERE clause for optional date range
		const dateFilter =
			startDate && endDate ? 'AND DATE(b.start_time) BETWEEN ? AND ?' : '';

		// Build params array - userId is used twice in statsSql
		const statsParams =
			startDate && endDate
				? [userId, userId, startDate, endDate]
				: [userId, userId];

		// For roomsSql, userId is used once
		const roomsParams =
			startDate && endDate ? [userId, startDate, endDate] : [userId];

		// Get aggregate stats
		const statsSql = `
			SELECT 
				? as user_id,
				COUNT(*) as total_bookings,
				SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as total_canceled_bookings,
				SUM(
					CASE 
						WHEN b.status != 'cancelled' 
						THEN TIMESTAMPDIFF(HOUR, b.start_time, b.end_time)
						ELSE 0
					END
				) as total_booked_hours,
				MIN(DATE(b.start_time)) as first_booking_date,
				MAX(DATE(b.start_time)) as last_booking_date
			FROM bookings b
			WHERE b.user_id = ?
			${dateFilter}
		`;

		interface StatsRow extends RowDataPacket {
			user_id: number;
			total_bookings: number;
			total_canceled_bookings: number;
			total_booked_hours: number;
			first_booking_date: Date | null;
			last_booking_date: Date | null;
		}

		const statsRows = await query<StatsRow>(statsSql, statsParams);
		const stats = statsRows[0];

		// Get rooms used breakdown
		const roomsSql = `
			SELECT 
				r.id as room_id,
				r.name as room_name,
				COUNT(*) as count
			FROM bookings b
			JOIN rooms r ON b.room_id = r.id
			WHERE b.user_id = ?
			${dateFilter}
			GROUP BY r.id, r.name
			ORDER BY count DESC, r.name ASC
		`;

		interface RoomRow extends RowDataPacket {
			room_id: number;
			room_name: string;
			count: number;
		}

		const roomRows = await query<RoomRow>(roomsSql, roomsParams);

		const roomsUsed: RoomUsage[] = roomRows.map((row: RoomRow) => ({
			room_id: row.room_id,
			room_name: row.room_name,
			count: Number(row.count),
		}));

		return {
			user_id: stats.user_id,
			total_bookings: Number(stats.total_bookings),
			total_canceled_bookings: Number(stats.total_canceled_bookings || 0),
			total_booked_hours: Number(stats.total_booked_hours || 0),
			first_booking_date: stats.first_booking_date
				? stats.first_booking_date.toISOString().split('T')[0]
				: null,
			last_booking_date: stats.last_booking_date
				? stats.last_booking_date.toISOString().split('T')[0]
				: null,
			rooms_used: roomsUsed,
		};
	}
}
