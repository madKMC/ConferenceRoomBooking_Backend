import { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { query } from '../config/db';
import {
	Booking,
	BookingWithRoom,
	CreateBookingInput,
	UpdateBookingInput,
} from '../domain/zod/bookings.schema';
import { InvitationsRepository } from './invitations.repo';

/**
 * Repository for booking-related database operations
 */
export class BookingsRepository {
	private invitationsRepo = new InvitationsRepository();
	/**
	 * Create a new booking
	 */
	async create(
		data: CreateBookingInput,
		connection: PoolConnection
	): Promise<Booking> {
		// Log to verify datetime format
		console.log('Creating booking with times:', {
			start_time: data.start_time,
			end_time: data.end_time,
		});

		const sql = `
      INSERT INTO bookings (
        room_id, user_id, title, description,
        start_time, end_time, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'confirmed')
    `;

		const [result] = await connection.execute<ResultSetHeader>(sql, [
			data.room_id,
			data.user_id,
			data.title,
			data.description || null,
			data.start_time,
			data.end_time,
		]);

		const booking = await this.findById(result.insertId, connection);
		if (!booking) {
			throw new Error('Failed to create booking');
		}

		return booking;
	}

	/**
	 * Find a booking by ID
	 */
	async findById(
		bookingId: number,
		connection?: PoolConnection
	): Promise<BookingWithRoom | null> {
		const sql = `
      SELECT 
        b.id, b.room_id, b.user_id, b.title, b.description,
        b.start_time, b.end_time, b.status,
        b.created_at, b.updated_at,
        r.name as room_name,
        r.capacity as room_capacity
      FROM bookings b
      INNER JOIN rooms r ON b.room_id = r.id
      WHERE b.id = ?
    `;

		const rows = connection
			? ((await connection.execute(sql, [bookingId]))[0] as RowDataPacket[])
			: await query<RowDataPacket[]>(sql, [bookingId]);

		if (rows.length === 0) {
			return null;
		}

		return rows[0] as BookingWithRoom;
	}

	/**
	 * Update a booking
	 */
	async update(
		bookingId: number,
		data: UpdateBookingInput,
		connection: PoolConnection
	): Promise<Booking | null> {
		const fields: string[] = [];
		const values: any[] = [];

		if (data.room_id !== undefined) {
			fields.push('room_id = ?');
			values.push(data.room_id);
		}
		if (data.title !== undefined) {
			fields.push('title = ?');
			values.push(data.title);
		}
		if (data.description !== undefined) {
			fields.push('description = ?');
			values.push(data.description);
		}
		if (data.start_time !== undefined) {
			fields.push('start_time = ?');
			values.push(data.start_time);
		}
		if (data.end_time !== undefined) {
			fields.push('end_time = ?');
			values.push(data.end_time);
		}
		if (data.status !== undefined) {
			fields.push('status = ?');
			values.push(data.status);
		}

		if (fields.length === 0) {
			return this.findById(bookingId, connection);
		}

		values.push(bookingId);

		const sql = `
      UPDATE bookings
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

		await connection.execute(sql, values);

		return this.findById(bookingId, connection);
	}

	/**
	 * Soft delete (cancel) a booking
	 */
	async cancel(
		bookingId: number,
		connection: PoolConnection
	): Promise<boolean> {
		const sql = `
      UPDATE bookings
      SET status = 'cancelled'
      WHERE id = ?
    `;

		const [result] = await connection.execute<ResultSetHeader>(sql, [
			bookingId,
		]);
		return result.affectedRows > 0;
	}

	/**
	 * Find all bookings for a user (as owner OR invitee)
	 */
	async findByUserId(
		userId: number,
		filters?: {
			status?: string;
			limit?: number;
			offset?: number;
		}
	): Promise<BookingWithRoom[]> {
		let sql = `
      SELECT DISTINCT
        b.id,
        b.room_id,
        b.user_id,
        b.title,
        b.description,
        b.start_time,
        b.end_time,
        b.status,
        b.created_at,
        b.updated_at,
        r.name as room_name,
        r.capacity as room_capacity,
        CASE 
          WHEN b.user_id = ? THEN 'owner'
          ELSE 'invitee'
        END AS role
      FROM bookings b
      INNER JOIN rooms r ON b.room_id = r.id
      LEFT JOIN booking_invitations bi ON b.id = bi.booking_id
      WHERE b.user_id = ? OR bi.user_id = ?
    `;

		const params: any[] = [userId, userId, userId];

		if (filters?.status) {
			sql += ' AND b.status = ?';
			params.push(filters.status);
		}

		sql += ' ORDER BY b.start_time DESC';

		if (filters?.limit) {
			sql += ' LIMIT ?';
			params.push(filters.limit);

			if (filters?.offset) {
				sql += ' OFFSET ?';
				params.push(filters.offset);
			}
		}

		const rows = await query<RowDataPacket[]>(sql, params);
		return rows as BookingWithRoom[];
	}

	/**
	 * Find all bookings (admin only)
	 */
	async findAll(filters?: {
		status?: string;
		room_id?: number;
		user_id?: number;
		date?: string;
		limit?: number;
		offset?: number;
	}): Promise<BookingWithRoom[]> {
		let sql = `
      SELECT 
        b.id,
        b.room_id,
        b.user_id,
        b.title,
        b.description,
        b.start_time,
        b.end_time,
        b.status,
        b.created_at,
        b.updated_at,
        r.name as room_name,
        r.capacity as room_capacity
      FROM bookings b
      INNER JOIN rooms r ON b.room_id = r.id
      WHERE 1=1
    `;

		const params: any[] = [];

		if (filters?.status) {
			sql += ' AND b.status = ?';
			params.push(filters.status);
		}

		if (filters?.room_id) {
			sql += ' AND b.room_id = ?';
			params.push(filters.room_id);
		}

		if (filters?.user_id) {
			sql += ' AND b.user_id = ?';
			params.push(filters.user_id);
		}

		if (filters?.date) {
			sql += ' AND DATE(b.start_time) = ?';
			params.push(filters.date);
		}

		sql += ' ORDER BY b.start_time DESC';

		if (filters?.limit) {
			sql += ' LIMIT ?';
			params.push(filters.limit);

			if (filters?.offset) {
				sql += ' OFFSET ?';
				params.push(filters.offset);
			}
		}

		const rows = await query<RowDataPacket[]>(sql, params);
		return rows as BookingWithRoom[];
	}

	/**
	 * Check for overlapping bookings (with row locking for concurrency control)
	 * This uses SELECT ... FOR UPDATE to acquire next-key locks
	 */
	async findOverlapping(
		roomId: number,
		startTime: string,
		endTime: string,
		excludeBookingId: number | null,
		connection: PoolConnection
	): Promise<number> {
		let sql = `
      SELECT id
      FROM bookings
      WHERE room_id = ?
        AND status IN ('confirmed', 'pending')
        AND start_time < ?
        AND end_time > ?
    `;

		const params: any[] = [roomId, endTime, startTime];

		if (excludeBookingId !== null) {
			sql += ' AND id != ?';
			params.push(excludeBookingId);
		}

		sql += ' FOR UPDATE';

		const [rows] = await connection.execute<RowDataPacket[]>(sql, params);
		return rows.length;
	}
}
