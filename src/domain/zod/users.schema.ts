import { z } from 'zod';
import { UserRole } from './auth.schema';

/**
 * Schema for getting user bookings
 */
export const getUserSchema = z.object({
	params: z.object({
		id: z.string().regex(/^\d+$/).transform(Number),
	}),
});

/**
 * User entity type
 */
export interface User {
	id: number;
	email: string;
	first_name: string;
	last_name: string;
	phone?: string;
	role: UserRole;
	created_at: Date;
	updated_at: Date;
}
