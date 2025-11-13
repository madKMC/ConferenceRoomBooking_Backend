import { z } from 'zod';

/**
 * Schema for getting all rooms
 */
export const getRoomsSchema = z.object({
	query: z
		.object({
			capacity: z.string().regex(/^\d+$/).transform(Number).optional(),
			floor: z.string().regex(/^\d+$/).transform(Number).optional(),
			limit: z.string().regex(/^\d+$/).transform(Number).optional(),
			offset: z.string().regex(/^\d+$/).transform(Number).optional(),
		})
		.optional(),
});

/**
 * Schema for getting room availability
 */
export const getRoomAvailabilitySchema = z.object({
	params: z.object({
		id: z.string().regex(/^\d+$/).transform(Number),
	}),
	query: z.object({
		date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	}),
});

/**
 * Amenity entity type
 */
export interface Amenity {
	id: number;
	name: string;
	description?: string;
	icon?: string;
	created_at: Date;
}

/**
 * Room entity type
 */
export interface Room {
	id: number;
	name: string;
	capacity: number;
	floor: number;
	description?: string;
	is_active: boolean;
	created_at: Date;
	updated_at: Date;
}

/**
 * Room with amenities
 */
export interface RoomWithAmenities extends Room {
	amenities: Amenity[];
}

/**
 * Time slot for availability
 */
export interface TimeSlot {
	start: string; // ISO 8601 datetime
	end: string; // ISO 8601 datetime
	available: boolean;
}

/**
 * Room availability response
 */
export interface RoomAvailability {
	room_id: number;
	room_name: string;
	date: string;
	business_hours: {
		start: string;
		end: string;
	};
	occupied_slots: Array<{
		start: string;
		end: string;
		booking_id: number;
		title: string;
	}>;
	available_slots: Array<{
		start: string;
		end: string;
	}>;
}
