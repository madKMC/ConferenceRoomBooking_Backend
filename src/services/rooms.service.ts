import { RoomsRepository } from '../repositories/rooms.repo';
import {
	RoomWithAmenities,
	RoomAvailability,
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
