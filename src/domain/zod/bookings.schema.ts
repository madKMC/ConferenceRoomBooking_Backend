import { z } from 'zod';

/**
 * Helper function to normalize datetime strings for MySQL
 * Converts ISO 8601 datetime strings (with or without 'Z') to MySQL DATETIME format
 * Example: "2025-11-15T13:00:00Z" -> "2025-11-15 13:00:00"
 */
const normalizeDatetime = (dateStr: string): string => {
	// Parse the date string and convert to MySQL format (YYYY-MM-DD HH:MM:SS)
	const date = new Date(dateStr);

	// Format to MySQL datetime format
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');

	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Booking status enum
 */
export const bookingStatusSchema = z.enum([
	'pending',
	'confirmed',
	'cancelled',
	'completed',
]);

export type BookingStatus = z.infer<typeof bookingStatusSchema>;

/**
 * Schema for creating a new booking
 */
export const createBookingSchema = z.object({
	body: z.object({
		room_id: z.number().int().positive(),
		user_id: z.number().int().positive(),
		title: z.string().min(1).max(255),
		description: z.string().max(1000).optional(),
		start_time: z.string().datetime().transform(normalizeDatetime),
		end_time: z.string().datetime().transform(normalizeDatetime),
	}),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>['body'];

/**
 * Schema for updating a booking
 */
export const updateBookingSchema = z.object({
	params: z.object({
		id: z.string().regex(/^\d+$/).transform(Number),
	}),
	body: z
		.object({
			room_id: z.number().int().positive().optional(),
			title: z.string().min(1).max(255).optional(),
			description: z.string().max(1000).optional(),
			start_time: z.string().datetime().transform(normalizeDatetime).optional(),
			end_time: z.string().datetime().transform(normalizeDatetime).optional(),
			status: bookingStatusSchema.optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: 'At least one field must be provided for update',
		}),
});

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>['body'];

/**
 * Schema for getting a booking by ID
 */
export const getBookingSchema = z.object({
	params: z.object({
		id: z.string().regex(/^\d+$/).transform(Number),
	}),
});

/**
 * Schema for deleting/cancelling a booking
 */
export const deleteBookingSchema = z.object({
	params: z.object({
		id: z.string().regex(/^\d+$/).transform(Number),
	}),
});

/**
 * Schema for getting user bookings
 */
export const getUserBookingsSchema = z.object({
	params: z.object({
		id: z.string().regex(/^\d+$/).transform(Number),
	}),
	query: z
		.object({
			status: bookingStatusSchema.optional(),
			limit: z.string().regex(/^\d+$/).transform(Number).optional(),
			offset: z.string().regex(/^\d+$/).transform(Number).optional(),
		})
		.optional(),
});

/**
 * Schema for getting all bookings (admin only)
 */
export const getAllBookingsSchema = z.object({
	query: z
		.object({
			status: bookingStatusSchema.optional(),
			room_id: z.string().regex(/^\d+$/).transform(Number).optional(),
			user_id: z.string().regex(/^\d+$/).transform(Number).optional(),
			limit: z.string().regex(/^\d+$/).transform(Number).optional(),
			offset: z.string().regex(/^\d+$/).transform(Number).optional(),
		})
		.optional(),
});

/**
 * Booking entity type
 */
export interface Booking {
	id: number;
	room_id: number;
	user_id: number;
	title: string;
	description?: string;
	start_time: Date;
	end_time: Date;
	status: BookingStatus;
	created_at: Date;
	updated_at: Date;
}

/**
 * Booking with room details
 */
export interface BookingWithRoom extends Booking {
	room_name: string;
	room_capacity: number;
}
