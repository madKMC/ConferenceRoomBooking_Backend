import { RoomsRepository } from '../repositories/rooms.repo';
import {
	RoomWithAmenities,
	RoomAvailability,
	Room,
} from '../domain/zod/rooms.schema';
import { NotFoundError } from '../utils/httpErrors';
import { generateTimeSlots, parseDate, BUSINESS_HOURS } from '../utils/time';

/**
 * Service for room-related business logic
 */
export class RoomsService {
	private roomsRepo: RoomsRepository;

	constructor() {
		this.roomsRepo = new RoomsRepository();
	}

	/**
	 * Get all rooms with their amenities
	 */
	async getAllRooms(filters?: {
		capacity?: number;
		floor?: number;
		limit?: number;
		offset?: number;
	}): Promise<RoomWithAmenities[]> {
		return this.roomsRepo.findAll(filters);
	}

	/**
	 * Get a single room by ID
	 */
	async getRoomById(roomId: number): Promise<Room> {
		const room = await this.roomsRepo.findById(roomId);
		if (!room) {
			throw new NotFoundError('Room not found');
		}
		return room;
	}

	/**
	 * Create a new room
	 */
	async createRoom(data: {
		name: string;
		capacity: number;
		floor: number;
		description?: string;
		is_active?: boolean;
	}): Promise<Room> {
		return this.roomsRepo.create(data);
	}

	/**
	 * Update an existing room
	 */
	async updateRoom(
		roomId: number,
		data: {
			name?: string;
			capacity?: number;
			floor?: number;
			description?: string;
			is_active?: boolean;
		}
	): Promise<Room> {
		// Verify room exists
		await this.getRoomById(roomId);
		return this.roomsRepo.update(roomId, data);
	}

	/**
	 * Get bookings for a specific room on a specific date
	 */
	async getRoomBookings(
		roomId: number,
		date: string
	): Promise<
		Array<{
			id: number;
			title: string;
			start_time: Date;
			end_time: Date;
			status: string;
		}>
	> {
		// Verify room exists
		await this.getRoomById(roomId);
		return this.roomsRepo.findBookingsByRoomAndDate(roomId, date);
	}

	/**
	 * Delete a room (soft delete)
	 */
	async deleteRoom(roomId: number): Promise<void> {
		// Verify room exists
		await this.getRoomById(roomId);
		const deleted = await this.roomsRepo.delete(roomId);
		if (!deleted) {
			throw new NotFoundError('Room not found');
		}
	}

	/**
	 * Get room availability for a specific date
	 * Returns occupied time slots and available 30-minute slots
	 */
	async getRoomAvailability(
		roomId: number,
		dateString: string
	): Promise<RoomAvailability> {
		// Verify room exists
		const room = await this.roomsRepo.findById(roomId);
		if (!room) {
			throw new NotFoundError('Room not found');
		}

		const date = parseDate(dateString);

		// Get all bookings for this room on this date
		const bookings = await this.roomsRepo.findBookingsByRoomAndDate(
			roomId,
			dateString
		);

		// Generate all possible 30-minute slots
		const allSlots = generateTimeSlots(date);

		// Mark which slots are occupied
		const availableSlots: Array<{ start: string; end: string }> = [];
		const occupiedSlots: Array<{
			start: string;
			end: string;
			booking_id: number;
			title: string;
		}> = [];

		for (const slot of allSlots) {
			const isOccupied = bookings.some((booking) => {
				const bookingStart = new Date(booking.start_time);
				const bookingEnd = new Date(booking.end_time);

				// Check if slot overlaps with booking
				return slot.start < bookingEnd && slot.end > bookingStart;
			});

			if (!isOccupied) {
				availableSlots.push({
					start: slot.start.toISOString(),
					end: slot.end.toISOString(),
				});
			}
		}

		// Format occupied slots
		for (const booking of bookings) {
			occupiedSlots.push({
				start: new Date(booking.start_time).toISOString(),
				end: new Date(booking.end_time).toISOString(),
				booking_id: booking.id,
				title: booking.title,
			});
		}

		return {
			room_id: roomId,
			room_name: room.name,
			date: dateString,
			business_hours: {
				start: `${BUSINESS_HOURS.START.toString().padStart(2, '0')}:00`,
				end: `${BUSINESS_HOURS.END.toString().padStart(2, '0')}:00`,
			},
			occupied_slots: occupiedSlots,
			available_slots: availableSlots,
		};
	}
}
