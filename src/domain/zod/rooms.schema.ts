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
 * Schema for getting a single room
 */
export const getRoomSchema = z.object({
	params: z.object({
		id: z.string().regex(/^\d+$/).transform(Number),
	}),
});

/**
 * Schema for creating a room
 */
export const createRoomSchema = z.object({
	body: z.object({
		name: z.string().min(1).max(100),
		capacity: z.number().int().positive().max(100),
		floor: z.number().int().min(0),
		description: z.string().max(1000).optional(),
		is_active: z.boolean().optional().default(true),
	}),
});

/**
 * Schema for updating a room
 */
export const updateRoomSchema = z.object({
	params: z.object({
		id: z.string().regex(/^\d+$/).transform(Number),
	}),
	body: z
		.object({
			name: z.string().min(1).max(100).optional(),
			capacity: z.number().int().positive().max(100).optional(),
			floor: z.number().int().min(0).optional(),
			description: z.string().max(1000).optional(),
			is_active: z.boolean().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: 'At least one field must be provided for update',
		}),
});

/**
 * Schema for deleting a room
 */
export const deleteRoomSchema = z.object({
	params: z.object({
		id: z.string().regex(/^\d+$/).transform(Number),
	}),
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
 * Schema for getting room bookings
 */
export const getRoomBookingsSchema = z.object({
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
