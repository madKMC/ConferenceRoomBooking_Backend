/**
 * Unit tests for Booking Notification Service
 * Tests email template generation and sending
 */
import {
	sendBookingInvitationEmail,
	sendBookingAcceptedEmail,
	sendBookingCancelledEmail,
} from '../../../src/services/notifications/bookingNotification';
import * as mailer from '../../../src/lib/mailer';

// Mock the mailer
jest.mock('../../../src/lib/mailer');

describe('Booking Notification Unit Tests', () => {
	const mockBooking = {
		id: 1,
		room_id: 1,
		user_id: 2,
		title: 'Team Meeting',
		description: 'Weekly sync meeting',
		start_time: new Date('2025-12-20T10:00:00'),
		end_time: new Date('2025-12-20T11:00:00'),
		status: 'confirmed' as const,
		room_name: 'Conference Room A',
		room_capacity: 12,
		created_at: new Date(),
		updated_at: new Date(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(mailer.sendEmail as jest.Mock).mockResolvedValue({ messageId: 'test-id' });
	});

	describe('sendBookingInvitationEmail', () => {
		it('should send invitation email with correct details', async () => {
			await sendBookingInvitationEmail({
				userName: 'John Doe',
				userEmail: 'john@test.com',
				booking: mockBooking,
				ownerName: 'Jane Smith',
			});

			expect(mailer.sendEmail).toHaveBeenCalledTimes(1);
			expect(mailer.sendEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: 'john@test.com',
					subject: expect.stringContaining('Team Meeting'),
					html: expect.stringContaining('Team Meeting'),
				})
			);
		});

		it('should include booking details in email', async () => {
			await sendBookingInvitationEmail({
				userName: 'John Doe',
				userEmail: 'john@test.com',
				booking: mockBooking,
				ownerName: 'Jane Smith',
			});

			const call = (mailer.sendEmail as jest.Mock).mock.calls[0][0];
			expect(call.html).toContain('Conference Room A');
			expect(call.html).toContain('Jane Smith');
		});

		it('should not throw error if email send fails', async () => {
			(mailer.sendEmail as jest.Mock).mockRejectedValue(new Error('SMTP error'));

			await expect(
				sendBookingInvitationEmail({
					userName: 'John Doe',
					userEmail: 'john@test.com',
					booking: mockBooking,
					ownerName: 'Jane Smith',
				})
			).resolves.not.toThrow();
		});
	});

	describe('sendBookingAcceptedEmail', () => {
		it('should send acceptance email to owner', async () => {
			await sendBookingAcceptedEmail({
				ownerName: 'Jane Smith',
				ownerEmail: 'jane@test.com',
				userName: 'John Doe',
				userEmail: 'john@test.com',
				booking: mockBooking,
			});

			expect(mailer.sendEmail).toHaveBeenCalledTimes(1);
			expect(mailer.sendEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: 'jane@test.com',
					subject: expect.stringContaining('accepted'),
				})
			);
		});

		it('should include invitee name in email', async () => {
			await sendBookingAcceptedEmail({
				ownerName: 'Jane Smith',
				ownerEmail: 'jane@test.com',
				userName: 'John Doe',
				userEmail: 'john@test.com',
				booking: mockBooking,
			});

			const call = (mailer.sendEmail as jest.Mock).mock.calls[0][0];
			expect(call.html).toContain('John Doe');
		});
	});

	describe('sendBookingCancelledEmail', () => {
		it('should send cancellation emails to accepted invitees', async () => {
			await sendBookingCancelledEmail({
				userName: 'User One',
				userEmail: 'user1@test.com',
				booking: mockBooking,
				ownerName: 'Jane Smith',
			});

			expect(mailer.sendEmail).toHaveBeenCalledTimes(1);
		});

		it('should include cancellation notice in email', async () => {
			await sendBookingCancelledEmail({
				userName: 'User One',
				userEmail: 'user1@test.com',
				booking: mockBooking,
				ownerName: 'Jane Smith',
			});

			const call = (mailer.sendEmail as jest.Mock).mock.calls[0][0];
			expect(call.subject).toContain('Cancelled');
			expect(call.html).toContain('cancelled');
		});
	});
});
