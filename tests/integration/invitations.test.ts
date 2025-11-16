/**
 * Integration tests for Invitation System endpoints
 * Tests: POST /bookings/:id/invitees, GET /bookings/:id/invitees,
 *        DELETE /bookings/:bookingId/invitees/:userId, PATCH /bookings/:id/invitation
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import { getUserAuthHeader } from '../helpers/authHelper';
import { testDb, TEST_IDS } from '../helpers/testDb';

const app = createApp();

// Mock the mailer to prevent actual emails
jest.mock('../../src/lib/mailer', () => require('../mocks/mailer.mock'));

describe('Invitations Integration Tests', () => {
	let bookingId: number;

	beforeEach(async () => {
		// Create a test booking owned by USER_1
		bookingId = await testDb.createBooking({
			room_id: TEST_IDS.ROOM_1,
			user_id: TEST_IDS.USER_1,
			title: 'Team Meeting',
			start_time: '2025-12-20 10:00:00',
			end_time: '2025-12-20 11:00:00',
		});
	});

	describe('POST /api/bookings/:id/invitees', () => {
		it('should allow owner to invite users', async () => {
			const response = await request(app)
				.post(`/api/bookings/${bookingId}/invitees`)
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					user_ids: [TEST_IDS.USER_2, TEST_IDS.USER_3],
				});

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(2);
			expect(response.body.data[0]).toHaveProperty('user_id');
			expect(response.body.data[0].status).toBe('pending');
		});

		it('should reset duplicate invitation to pending', async () => {
			// Create an invitation that was previously declined
			await testDb.createInvitation({
				booking_id: bookingId,
				user_id: TEST_IDS.USER_2,
				status: 'declined',
			});

			// Re-invite the same user
			const response = await request(app)
				.post(`/api/bookings/${bookingId}/invitees`)
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					user_ids: [TEST_IDS.USER_2],
				});

			expect(response.status).toBe(201);
			expect(response.body.data[0].status).toBe('pending');
		});

		it('should return 403 when non-owner tries to invite', async () => {
			const response = await request(app)
				.post(`/api/bookings/${bookingId}/invitees`)
				.set(getUserAuthHeader(TEST_IDS.USER_2))
				.send({
					user_ids: [TEST_IDS.USER_3],
				});

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should return 400 for invalid user IDs', async () => {
			const response = await request(app)
				.post(`/api/bookings/${bookingId}/invitees`)
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					user_ids: [99999],
				});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe('BAD_REQUEST');
		});

		it('should return 422 when inviting less than 1 user', async () => {
			const response = await request(app)
				.post(`/api/bookings/${bookingId}/invitees`)
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					user_ids: [],
				});

			expect(response.status).toBe(422);
			expect(response.body.code).toBe('VALIDATION_ERROR');
		});

		it('should return 422 when inviting more than 20 users', async () => {
			const response = await request(app)
				.post(`/api/bookings/${bookingId}/invitees`)
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					user_ids: Array(21).fill(TEST_IDS.USER_2),
				});

			expect(response.status).toBe(422);
			expect(response.body.code).toBe('VALIDATION_ERROR');
		});

		it('should return 404 for non-existent booking', async () => {
			const response = await request(app)
				.post('/api/bookings/99999/invitees')
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					user_ids: [TEST_IDS.USER_2],
				});

			expect(response.status).toBe(404);
			expect(response.body.code).toBe('NOT_FOUND');
		});
	});

	describe('GET /api/bookings/:id/invitees', () => {
		beforeEach(async () => {
			// Add some invitations
			await testDb.createInvitation({
				booking_id: bookingId,
				user_id: TEST_IDS.USER_2,
				status: 'accepted',
			});
			await testDb.createInvitation({
				booking_id: bookingId,
				user_id: TEST_IDS.USER_3,
				status: 'pending',
			});
		});

		it('should allow owner to view invitees', async () => {
			const response = await request(app)
				.get(`/api/bookings/${bookingId}/invitees`)
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(2);
		});

		it('should allow invitee to view invitees', async () => {
			const response = await request(app)
				.get(`/api/bookings/${bookingId}/invitees`)
				.set(getUserAuthHeader(TEST_IDS.USER_2));

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});

		it('should return 403 for non-participant', async () => {
			const response = await request(app)
				.get(`/api/bookings/${bookingId}/invitees`)
				.set(getUserAuthHeader(TEST_IDS.USER_4));

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should display expired status when booking started', async () => {
			// Create a past booking
			const pastBookingId = await testDb.createBooking({
				room_id: TEST_IDS.ROOM_2,
				user_id: TEST_IDS.USER_1,
				title: 'Past Meeting',
				start_time: '2024-01-10 10:00:00',
				end_time: '2024-01-10 11:00:00',
			});

			await testDb.createInvitation({
				booking_id: pastBookingId,
				user_id: TEST_IDS.USER_2,
				status: 'pending',
			});

			const response = await request(app)
				.get(`/api/bookings/${pastBookingId}/invitees`)
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(200);
			expect(response.body.data[0].display_status).toBe('expired');
		});

		it('should return 404 for non-existent booking', async () => {
			const response = await request(app)
				.get('/api/bookings/99999/invitees')
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(404);
			expect(response.body.code).toBe('NOT_FOUND');
		});
	});

	describe('DELETE /api/bookings/:bookingId/invitees/:userId', () => {
		beforeEach(async () => {
			await testDb.createInvitation({
				booking_id: bookingId,
				user_id: TEST_IDS.USER_2,
				status: 'accepted',
			});
		});

		it('should allow owner to remove invitee', async () => {
			const response = await request(app)
				.delete(`/api/bookings/${bookingId}/invitees/${TEST_IDS.USER_2}`)
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.message).toContain('removed');
		});

		it('should return 403 when non-owner tries to remove invitee', async () => {
			const response = await request(app)
				.delete(`/api/bookings/${bookingId}/invitees/${TEST_IDS.USER_2}`)
				.set(getUserAuthHeader(TEST_IDS.USER_3));

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should return 404 when invitation not found', async () => {
			const response = await request(app)
				.delete(`/api/bookings/${bookingId}/invitees/${TEST_IDS.USER_5}`)
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(404);
			expect(response.body.code).toBe('NOT_FOUND');
		});
	});

	describe('PATCH /api/bookings/:id/invitation', () => {
		beforeEach(async () => {
			await testDb.createInvitation({
				booking_id: bookingId,
				user_id: TEST_IDS.USER_2,
				status: 'pending',
			});
		});

		it('should allow invitee to accept invitation', async () => {
			const response = await request(app)
				.patch(`/api/bookings/${bookingId}/invitation`)
				.set(getUserAuthHeader(TEST_IDS.USER_2))
				.send({
					status: 'accepted',
				});

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.message).toContain('accepted');
		});

		it('should allow invitee to decline invitation', async () => {
			const response = await request(app)
				.patch(`/api/bookings/${bookingId}/invitation`)
				.set(getUserAuthHeader(TEST_IDS.USER_2))
				.send({
					status: 'declined',
				});

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.message).toContain('declined');
		});

		it('should return 400 when responding after booking started', async () => {
			// Create a past booking with pending invitation
			const pastBookingId = await testDb.createBooking({
				room_id: TEST_IDS.ROOM_2,
				user_id: TEST_IDS.USER_1,
				title: 'Past Meeting',
				start_time: '2024-01-10 10:00:00',
				end_time: '2024-01-10 11:00:00',
			});

			await testDb.createInvitation({
				booking_id: pastBookingId,
				user_id: TEST_IDS.USER_2,
				status: 'pending',
			});

			const response = await request(app)
				.patch(`/api/bookings/${pastBookingId}/invitation`)
				.set(getUserAuthHeader(TEST_IDS.USER_2))
				.send({
					status: 'accepted',
				});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe('BAD_REQUEST');
		});

		it('should return 422 for invalid status value', async () => {
			const response = await request(app)
				.patch(`/api/bookings/${bookingId}/invitation`)
				.set(getUserAuthHeader(TEST_IDS.USER_2))
				.send({
					status: 'invalid_status',
				});

			expect(response.status).toBe(422);
			expect(response.body.code).toBe('VALIDATION_ERROR');
		});

		it('should return 404 when invitation not found', async () => {
			const response = await request(app)
				.patch(`/api/bookings/${bookingId}/invitation`)
				.set(getUserAuthHeader(TEST_IDS.USER_5))
				.send({
					status: 'accepted',
				});

			expect(response.status).toBe(404);
			expect(response.body.code).toBe('NOT_FOUND');
		});
	});
});
