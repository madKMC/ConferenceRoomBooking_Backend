/**
 * Integration tests for Users endpoints
 * Tests: GET /users, GET /users/:id/bookings
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import { getAdminAuthHeader, getUserAuthHeader } from '../helpers/authHelper';
import { testDb, TEST_IDS } from '../helpers/testDb';

const app = createApp();

describe('Users Integration Tests', () => {
	describe('GET /api/users', () => {
		it('should list users with authentication', async () => {
			const response = await request(app)
				.get('/api/users')
				.set(getUserAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBeGreaterThan(0);
		});

		it('should search by name or email', async () => {
			const response = await request(app)
				.get('/api/users?search=john')
				.set(getUserAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});

		it('should support pagination', async () => {
			const response = await request(app)
				.get('/api/users?limit=2&offset=0')
				.set(getUserAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.length).toBeLessThanOrEqual(2);
		});

		it('should return 401 without token', async () => {
			const response = await request(app).get('/api/users');

			expect(response.status).toBe(401);
			expect(response.body.code).toBe('UNAUTHORIZED');
		});
	});

	describe('GET /api/users/:id/bookings', () => {
		beforeEach(async () => {
			// Create bookings for USER_1
			await testDb.createBooking({
				room_id: TEST_IDS.ROOM_1,
				user_id: TEST_IDS.USER_1,
				title: 'User 1 Booking',
				start_time: '2025-12-20 10:00:00',
				end_time: '2025-12-20 11:00:00',
				status: 'confirmed',
			});

			const bookingId = await testDb.createBooking({
				room_id: TEST_IDS.ROOM_2,
				user_id: TEST_IDS.USER_2,
				title: 'User 2 Booking',
				start_time: '2025-12-20 14:00:00',
				end_time: '2025-12-20 15:00:00',
				status: 'confirmed',
			});

			// Invite USER_1 to USER_2's booking
			await testDb.createInvitation({
				booking_id: bookingId,
				user_id: TEST_IDS.USER_1,
				status: 'accepted',
			});
		});

		it('should allow user to get own bookings', async () => {
			const response = await request(app)
				.get(`/api/users/${TEST_IDS.USER_1}/bookings`)
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBeGreaterThan(0);
		});

		it('should return 403 when user tries to view others bookings', async () => {
			const response = await request(app)
				.get(`/api/users/${TEST_IDS.USER_2}/bookings`)
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should allow admin to get any users bookings', async () => {
			const response = await request(app)
				.get(`/api/users/${TEST_IDS.USER_1}/bookings`)
				.set(getAdminAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});

		it('should filter by status', async () => {
			const response = await request(app)
				.get(`/api/users/${TEST_IDS.USER_1}/bookings?status=confirmed`)
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(200);
			response.body.data.forEach((booking: any) => {
				expect(booking.status).toBe('confirmed');
			});
		});

		it('should show role as owner or invitee', async () => {
			const response = await request(app)
				.get(`/api/users/${TEST_IDS.USER_1}/bookings`)
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(200);
			response.body.data.forEach((booking: any) => {
				expect(['owner', 'invitee']).toContain(booking.role);
			});
		});

		it('should include room_name and room_capacity', async () => {
			const response = await request(app)
				.get(`/api/users/${TEST_IDS.USER_1}/bookings`)
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(200);
			expect(response.body.data[0]).toHaveProperty('room_name');
			expect(response.body.data[0]).toHaveProperty('room_capacity');
		});
	});
});
