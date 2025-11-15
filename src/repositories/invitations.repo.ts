import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { getPool } from '../config/db';

export interface BookingInvitation {
	id: number;
	booking_id: number;
	user_id: number;
	status: 'pending' | 'accepted' | 'declined';
	invited_at: Date;
	responded_at: Date | null;
}

export interface InvitationWithUser extends BookingInvitation {
	email: string;
	first_name: string;
	last_name: string;
	start_time: Date;
	display_status: 'pending' | 'accepted' | 'declined' | 'expired';
}

/**
 * Repository for booking invitation-related database operations
 */
export class InvitationsRepository {
	private pool = getPool();

	/**
	 * Add invitees to a booking (bulk insert with duplicate handling)
	 */
	async addInvitees(
		bookingId: number,
		userIds: number[],
		connection?: PoolConnection
	): Promise<void> {
		if (userIds.length === 0) return;

		const values = userIds
			.map((userId) => `(${bookingId}, ${userId})`)
			.join(',');

		const query = `
			INSERT INTO booking_invitations (booking_id, user_id)
			VALUES ${values}
			ON DUPLICATE KEY UPDATE invited_at = CURRENT_TIMESTAMP, status = 'pending'
		`;

		if (connection) {
			await connection.execute(query);
		} else {
			await this.pool.execute(query);
		}
	}

	/**
	 * Remove an invitee from a booking
	 */
	async removeInvitee(
		bookingId: number,
		userId: number,
		connection?: PoolConnection
	): Promise<boolean> {
		const query = `
			DELETE FROM booking_invitations
			WHERE booking_id = ? AND user_id = ?
		`;

		const executor = connection || this.pool;
		const [result] = await executor.execute<ResultSetHeader>(query, [
			bookingId,
			userId,
		]);
		return result.affectedRows > 0;
	}

	/**
	 * Get all invitees for a booking
	 */
	async getInviteesByBooking(
		bookingId: number,
		connection?: PoolConnection
	): Promise<InvitationWithUser[]> {
		const query = `
			SELECT 
				bi.id,
				bi.booking_id,
				bi.user_id,
				bi.status,
				bi.invited_at,
				bi.responded_at,
				u.email,
				u.first_name,
				u.last_name,
				b.start_time,
				CASE 
					WHEN b.start_time <= NOW() AND bi.status = 'pending' THEN 'expired'
					ELSE bi.status
				END as display_status
			FROM booking_invitations bi
			JOIN users u ON bi.user_id = u.id
			JOIN bookings b ON bi.booking_id = b.id
			WHERE bi.booking_id = ?
			ORDER BY bi.invited_at DESC
		`;

		const executor = connection || this.pool;
		const [rows] = await executor.execute<RowDataPacket[]>(query, [bookingId]);
		return rows as InvitationWithUser[];
	}

	/**
	 * Update invitation status (accept/decline)
	 */
	async updateStatus(
		bookingId: number,
		userId: number,
		status: 'accepted' | 'declined',
		connection?: PoolConnection
	): Promise<boolean> {
		const query = `
			UPDATE booking_invitations
			SET status = ?, responded_at = CURRENT_TIMESTAMP
			WHERE booking_id = ? AND user_id = ?
		`;

		const executor = connection || this.pool;
		const [result] = await executor.execute<ResultSetHeader>(query, [
			status,
			bookingId,
			userId,
		]);

		return result.affectedRows > 0;
	}

	/**
	 * Check if a user is invited to a booking
	 */
	async isUserInvited(
		bookingId: number,
		userId: number,
		connection?: PoolConnection
	): Promise<boolean> {
		const query = `
			SELECT id FROM booking_invitations
			WHERE booking_id = ? AND user_id = ?
		`;

		const executor = connection || this.pool;
		const [rows] = await executor.execute<RowDataPacket[]>(query, [
			bookingId,
			userId,
		]);
		return rows.length > 0;
	}
}
