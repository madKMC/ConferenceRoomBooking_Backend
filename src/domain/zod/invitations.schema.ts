import { z } from 'zod';

/**
 * Schema for adding invitees to a booking
 */
export const addInviteesSchema = z.object({
	params: z.object({
		id: z
			.string()
			.regex(/^\d+$/, 'Booking ID must be a number')
			.transform(Number),
	}),
	body: z.object({
		user_ids: z
			.array(z.number().int().positive())
			.min(1, 'At least one user must be invited')
			.max(20, 'Cannot invite more than 20 users at once'),
	}),
});

/**
 * Schema for removing an invitee from a booking
 */
export const removeInviteeSchema = z.object({
	params: z.object({
		bookingId: z
			.string()
			.regex(/^\d+$/, 'Booking ID must be a number')
			.transform(Number),
		userId: z
			.string()
			.regex(/^\d+$/, 'User ID must be a number')
			.transform(Number),
	}),
});

/**
 * Schema for responding to a booking invitation
 */
export const respondToInvitationSchema = z.object({
	params: z.object({
		id: z
			.string()
			.regex(/^\d+$/, 'Booking ID must be a number')
			.transform(Number),
	}),
	body: z.object({
		status: z.enum(['accepted', 'declined'], {
			errorMap: () => ({
				message: 'Status must be either "accepted" or "declined"',
			}),
		}),
	}),
});

/**
 * Schema for listing users (with optional search)
 */
export const listUsersSchema = z.object({
	query: z.object({
		search: z.string().optional(),
		limit: z.string().regex(/^\d+$/).transform(Number).default('50').optional(),
		offset: z.string().regex(/^\d+$/).transform(Number).default('0').optional(),
	}),
});

export type AddInviteesInput = z.infer<typeof addInviteesSchema>['body'];
export type RemoveInviteeParams = z.infer<typeof removeInviteeSchema>['params'];
export type RespondToInvitationInput = z.infer<
	typeof respondToInvitationSchema
>['body'];
export type ListUsersQuery = z.infer<typeof listUsersSchema>['query'];
