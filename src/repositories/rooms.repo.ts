import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { query } from '../config/db';
import { Room, RoomWithAmenities, Amenity } from '../domain/zod/rooms.schema';

/**
 * Repository for room-related database operations
 */
export class RoomsRepository {
	/**
	 * Get all rooms with optional filters
	 */
	async findAll(filters?: {
		capacity?: number;
		floor?: number;
		limit?: number;
		offset?: number;
	}): Promise<RoomWithAmenities[]> {
		let sql = `
      SELECT 
        r.id,
        r.name,
        r.capacity,
        r.floor,
        r.description,
        r.is_active,
        r.created_at,
        r.updated_at
      FROM rooms r
      WHERE r.is_active = TRUE
    `;

		const params: any[] = [];

		if (filters?.capacity) {
			sql += ' AND r.capacity >= ?';
			params.push(filters.capacity);
		}

		if (filters?.floor !== undefined) {
			sql += ' AND r.floor = ?';
			params.push(filters.floor);
		}

		sql += ' ORDER BY r.name';

		if (filters?.limit) {
			sql += ' LIMIT ?';
			params.push(filters.limit);

			if (filters?.offset) {
				sql += ' OFFSET ?';
				params.push(filters.offset);
			}
		}

		const rooms = await query<RowDataPacket[]>(sql, params);

		// Fetch amenities for each room
		const roomsWithAmenities: RoomWithAmenities[] = [];
		for (const room of rooms) {
			const amenities = await this.findAmenitiesByRoomId(room.id);
			roomsWithAmenities.push({
				...room,
				is_active: Boolean(room.is_active),
				amenities,
			} as RoomWithAmenities);
		}

		return roomsWithAmenities;
	}

	/**
	 * Find a room by ID
	 */
	async findById(roomId: number): Promise<Room | null> {
		const sql = `
      SELECT 
        id, name, capacity, floor, description, 
        is_active, created_at, updated_at
      FROM rooms
      WHERE id = ?
    `;

		const rows = await query<RowDataPacket[]>(sql, [roomId]);

		if (rows.length === 0) {
			return null;
		}

		return {
			...rows[0],
			is_active: Boolean(rows[0].is_active),
		} as Room;
	}

	/**
	 * Find amenities for a specific room
	 */
	async findAmenitiesByRoomId(roomId: number): Promise<Amenity[]> {
		const sql = `
      SELECT 
        a.id,
        a.name,
        a.description,
        a.icon,
        a.created_at
      FROM amenities a
      INNER JOIN room_amenities ra ON a.id = ra.amenity_id
      WHERE ra.room_id = ?
      ORDER BY a.name
    `;

		const amenities = await query<RowDataPacket[]>(sql, [roomId]);
		return amenities as Amenity[];
	}

	/**
	 * Get bookings for a specific room on a specific date
	 * Used for availability checking
	 */
	async findBookingsByRoomAndDate(
		roomId: number,
		date: string,
		connection?: PoolConnection
	): Promise<
		Array<{
			id: number;
			title: string;
			start_time: Date;
			end_time: Date;
			status: string;
		}>
	> {
		const sql = `
      SELECT 
        id,
        title,
        start_time,
        end_time,
        status
      FROM bookings
      WHERE room_id = ?
        AND DATE(start_time) = ?
        AND status IN ('confirmed', 'pending')
      ORDER BY start_time
    `;

		const executor = connection || { execute: query };
		const rows = await (connection
			? connection.execute(sql, [roomId, date])
			: query<RowDataPacket[]>(sql, [roomId, date]));

		const result = connection
			? (rows[0] as RowDataPacket[])
			: (rows as RowDataPacket[]);
		return result as Array<{
			id: number;
			title: string;
			start_time: Date;
			end_time: Date;
			status: string;
		}>;
	}
}
