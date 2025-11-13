import { z } from 'zod';

/**
 * User role enum
 */
export const userRoleSchema = z.enum(['user', 'admin']);

export type UserRole = z.infer<typeof userRoleSchema>;

/**
 * Schema for user registration
 */
export const registerSchema = z.object({
	body: z.object({
		email: z.string().email(),
		password: z.string().min(8).max(100),
		first_name: z.string().min(1).max(100),
		last_name: z.string().min(1).max(100),
		phone: z.string().max(20).optional(),
	}),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];

/**
 * Schema for user login
 */
export const loginSchema = z.object({
	body: z.object({
		email: z.string().email(),
		password: z.string().min(1),
	}),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];

/**
 * Auth token payload
 */
export interface TokenPayload {
	userId: number;
	email: string;
	role: UserRole;
}

/**
 * Login response
 */
export interface LoginResponse {
	token: string;
	user: {
		id: number;
		email: string;
		first_name: string;
		last_name: string;
		role: UserRole;
	};
}
