import { Request, Response, NextFunction } from 'express';
import { InvitationsService } from '../services/invitations.service';

/**
 * Controller for booking invitation endpoints
 */
export class InvitationsController {
	private invitationsService: InvitationsService;

	constructor() {
		this.invitationsService = new InvitationsService();
	}

	/**
	 * POST /bookings/:id/invitees
	 * Add users to a booking (owner only)
	 */
	addInvitees = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const bookingId = Number(req.params.id);
			const { user_ids } = req.body;
			const requestingUserId = req.user!.userId;

			const invitees = await this.invitationsService.addInvitees(
				bookingId,
				user_ids,
				requestingUserId
			);

			res.status(200).json({
				success: true,
				data: invitees,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * DELETE /bookings/:bookingId/invitees/:userId
	 * Remove a user from a booking (owner only)
	 */
	removeInvitee = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const bookingId = Number(req.params.bookingId);
			const inviteeUserId = Number(req.params.userId);
			const requestingUserId = req.user!.userId;

			const result = await this.invitationsService.removeInvitee(
				bookingId,
				inviteeUserId,
				requestingUserId
			);

			res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * PATCH /bookings/:id/invitation
	 * Respond to a booking invitation (invitee only)
	 */
	respondToInvitation = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const bookingId = Number(req.params.id);
			const { status } = req.body;
			const userId = req.user!.userId;

			const result = await this.invitationsService.respondToInvitation(
				bookingId,
				userId,
				status
			);

			res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * GET /bookings/:id/invitees
	 * Get all invitees for a booking (owner, invitees, or admin only)
	 */
	getInvitees = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const bookingId = Number(req.params.id);
			const requestingUserId = req.user!.userId;
			const isAdmin = req.user!.role === 'admin';

			const invitees = await this.invitationsService.getInviteesByBooking(
				bookingId,
				requestingUserId,
				isAdmin
			);

			res.status(200).json({
				success: true,
				data: invitees,
			});
		} catch (error) {
			next(error);
		}
	};
}
