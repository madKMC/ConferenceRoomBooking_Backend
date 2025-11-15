import { InvitationsRepository } from '../repositories/invitations.repo';
import { BookingsRepository } from '../repositories/bookings.repo';
import { UsersRepository } from '../repositories/users.repo';
import { withTransaction } from '../config/db';
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
} from '../utils/httpErrors';
import {
	sendBookingInvitationEmail,
	sendBookingAcceptedEmail,
} from './notifications/bookingNotification';
import { logger } from '../utils/logger';

export class InvitationsService {
	private invitationsRepo = new InvitationsRepository();
	private bookingsRepo = new BookingsRepository();
	private usersRepo = new UsersRepository();

	async addInvitees(
		bookingId: number,
		userIds: number[],
		requestingUserId: number
	) {
		return withTransaction(async (connection) => {
			// Verify booking exists and user is the owner
			const booking = await this.bookingsRepo.findById(bookingId, connection);
			if (!booking) {
				throw new NotFoundError('Booking not found');
			}

			if (booking.user_id !== requestingUserId) {
				throw new ForbiddenError('Only the booking owner can invite users');
			}

			// Verify all users exist
			const validUserIds: number[] = [];
			for (const userId of userIds) {
				// Don't allow inviting the owner
				if (userId === requestingUserId) {
					continue;
				}

				const user = await this.usersRepo.findById(userId, connection);
				if (user) {
					validUserIds.push(userId);
				}
			}

			if (validUserIds.length === 0) {
				throw new BadRequestError('No valid users to invite');
			}

			// Add invitees
			await this.invitationsRepo.addInvitees(
				bookingId,
				validUserIds,
				connection
			);

			// Get the updated list of invitees to return
			const invitees = await this.invitationsRepo.getInviteesByBooking(
				bookingId,
				connection
			);

			// Transaction commits here - all database operations completed successfully

			// Send email notifications to all invited users (async, non-blocking, after commit)
			const owner = await this.usersRepo.findById(requestingUserId);
			if (owner) {
				for (const userId of validUserIds) {
					const invitee = await this.usersRepo.findById(userId);
					if (invitee) {
						sendBookingInvitationEmail({
							userName: `${invitee.first_name} ${invitee.last_name}`,
							userEmail: invitee.email,
							booking,
							ownerName: `${owner.first_name} ${owner.last_name}`,
						}).catch((error) => {
							logger.error('Failed to send invitation email', {
								bookingId,
								userId,
								error: error instanceof Error ? error.message : 'Unknown error',
							});
						});
					}
				}
			}

			return invitees;
		});
	}

	async removeInvitee(
		bookingId: number,
		inviteeUserId: number,
		requestingUserId: number
	) {
		return withTransaction(async (connection) => {
			// Verify booking exists and user is the owner
			const booking = await this.bookingsRepo.findById(bookingId, connection);
			if (!booking) {
				throw new NotFoundError('Booking not found');
			}

			if (booking.user_id !== requestingUserId) {
				throw new ForbiddenError('Only the booking owner can remove invitees');
			}

			// Remove the invitee
			const removed = await this.invitationsRepo.removeInvitee(
				bookingId,
				inviteeUserId,
				connection
			);
			if (!removed) {
				throw new NotFoundError('Invitation not found');
			}

			return { message: 'Invitee removed successfully' };
		});
	}

	async respondToInvitation(
		bookingId: number,
		userId: number,
		status: 'accepted' | 'declined'
	) {
		return withTransaction(async (connection) => {
			// Verify the invitation exists
			const isInvited = await this.invitationsRepo.isUserInvited(
				bookingId,
				userId,
				connection
			);
			if (!isInvited) {
				throw new NotFoundError('Invitation not found');
			}

			// Verify the booking hasn't started or passed
			const booking = await this.bookingsRepo.findById(bookingId, connection);
			if (!booking) {
				throw new NotFoundError('Booking not found');
			}

			if (booking.start_time <= new Date()) {
				throw new BadRequestError(
					'Cannot respond to invitation - booking has already started or passed'
				);
			}

			// Update the status
			await this.invitationsRepo.updateStatus(
				bookingId,
				userId,
				status,
				connection
			);

			// Transaction commits here

			// If accepted, send notification email to booking owner (async, after commit)
			if (status === 'accepted') {
				const invitee = await this.usersRepo.findById(userId);
				const owner = await this.usersRepo.findById(booking.user_id);

				if (invitee && owner) {
					sendBookingAcceptedEmail({
						userName: `${invitee.first_name} ${invitee.last_name}`,
						userEmail: owner.email, // Send to owner
						booking,
						ownerName: `${owner.first_name} ${owner.last_name}`,
					}).catch((error) => {
						logger.error('Failed to send acceptance notification email', {
							bookingId,
							userId,
							error: error instanceof Error ? error.message : 'Unknown error',
						});
					});
				}
			}

			return { message: `Invitation ${status} successfully` };
		});
	}

	async getInviteesByBooking(
		bookingId: number,
		requestingUserId: number,
		isAdmin: boolean
	) {
		// Verify booking exists
		const booking = await this.bookingsRepo.findById(bookingId);
		if (!booking) {
			throw new NotFoundError('Booking not found');
		}

		// Only the owner, invitees, or admins can view invitees
		if (!isAdmin && booking.user_id !== requestingUserId) {
			const isInvited = await this.invitationsRepo.isUserInvited(
				bookingId,
				requestingUserId
			);
			if (!isInvited) {
				throw new ForbiddenError('Access denied');
			}
		}

		return this.invitationsRepo.getInviteesByBooking(bookingId);
	}
}
