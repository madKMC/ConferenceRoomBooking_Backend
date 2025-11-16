/**
 * Integration tests for Analytics endpoints
 * Tests: GET /analytics/utilization, GET /analytics/bookings/daily, GET /analytics/users/:id/summary
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import { getAdminAuthHeader, getUserAuthHeader } from '../helpers/authHelper';
import { testDb, TEST_IDS } from '../helpers/testDb';

const app = createApp();

describe('Analytics Integration Tests', () => {
	beforeEach(async () => {
		// Create test bookings for analytics
		await testDb.createBooking({
			room_id: TEST_IDS.ROOM_1,
			user_id: TEST_IDS.USER_1,
			title: 'Analytics Test 1',
			start_time: '2025-11-10 10:00:00',
			end_time: '2025-11-10 12:00:00',
			status: 'confirmed',
		});
		await testDb.createBooking({
			room_id: TEST_IDS.ROOM_1,
			user_id: TEST_IDS.USER_1,
			title: 'Analytics Test 2',
			start_time: '2025-11-11 14:00:00',
			end_time: '2025-11-11 15:30:00',
			status: 'completed',
		});
		await testDb.createBooking({
			room_id: TEST_IDS.ROOM_2,
			user_id: TEST_IDS.USER_2,
			title: 'Analytics Test 3',
			start_time: '2025-11-10 09:00:00',
			end_time: '2025-11-10 10:00:00',
			status: 'cancelled',
		});
	});

	describe('GET /api/analytics/utilization', () => {
		it('should allow admin to get room utilization', async () => {
			const response = await request(app)
				.get('/api/analytics/utilization?start=2025-11-01&end=2025-11-30')
				.set(getAdminAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(Array.isArray(response.body.data)).toBe(true);
			if (response.body.data.length > 0) {
				expect(response.body.data[0]).toHaveProperty('room_id');
				expect(response.body.data[0]).toHaveProperty('room_name');
				expect(response.body.data[0]).toHaveProperty('total_booked_hours');
				expect(response.body.data[0]).toHaveProperty('utilization_percentage');
			}
		});

		it('should return 403 when user tries to access', async () => {
			const response = await request(app)
				.get('/api/analytics/utilization?start=2025-11-01&end=2025-11-30')
				.set(getUserAuthHeader());

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should return 400 for missing date parameters', async () => {
			const response = await request(app)
				.get('/api/analytics/utilization')
				.set(getAdminAuthHeader());

			expect(response.status).toBe(400);
			expect(response.body.code).toBe('BAD_REQUEST');
		});

		it('should return 400 for invalid date format', async () => {
			const response = await request(app)
				.get('/api/analytics/utilization?start=invalid&end=2025-11-30')
				.set(getAdminAuthHeader());

			expect(response.status).toBe(400);
			expect(response.body.code).toBe('BAD_REQUEST');
		});

		it('should return 400 when start date after end date', async () => {
			const response = await request(app)
				.get('/api/analytics/utilization?start=2025-11-30&end=2025-11-01')
				.set(getAdminAuthHeader());

			expect(response.status).toBe(400);
			expect(response.body.code).toBe('BAD_REQUEST');
		});
	});

	describe('GET /api/analytics/bookings/daily', () => {
		it('should allow admin to get daily trends', async () => {
			const response = await request(app)
				.get('/api/analytics/bookings/daily?start=2025-11-01&end=2025-11-30')
				.set(getAdminAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(Array.isArray(response.body.data)).toBe(true);
			if (response.body.data.length > 0) {
				expect(response.body.data[0]).toHaveProperty('date');
				expect(response.body.data[0]).toHaveProperty('total_bookings');
				expect(response.body.data[0]).toHaveProperty('total_booked_hours');
			}
		});

		it('should return 403 when user tries to access', async () => {
			const response = await request(app)
				.get('/api/analytics/bookings/daily?start=2025-11-01&end=2025-11-30')
				.set(getUserAuthHeader());

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should group by date correctly', async () => {
			const response = await request(app)
				.get('/api/analytics/bookings/daily?start=2025-11-10&end=2025-11-11')
				.set(getAdminAuthHeader());

			expect(response.status).toBe(200);
			const dates = response.body.data.map((d: any) => d.date);
			expect(dates).toContain('2025-11-10');
		});
	});

	describe('GET /api/analytics/users/:id/summary', () => {
		it('should allow admin to get user summary', async () => {
			const response = await request(app)
				.get(`/api/analytics/users/${TEST_IDS.USER_1}/summary`)
				.set(getAdminAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty('user_id');
			expect(response.body.data).toHaveProperty('total_bookings');
			expect(response.body.data).toHaveProperty('total_canceled_bookings');
			expect(response.body.data).toHaveProperty('total_booked_hours');
			expect(Array.isArray(response.body.data.rooms_used)).toBe(true);
		});

		it('should allow user to get own summary', async () => {
			const response = await request(app)
				.get(`/api/analytics/users/${TEST_IDS.USER_1}/summary`)
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});

		it('should return 403 when user tries to get others summary', async () => {
			const response = await request(app)
				.get(`/api/analytics/users/${TEST_IDS.USER_2}/summary`)
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should return 404 for non-existent user', async () => {
			const response = await request(app)
				.get('/api/analytics/users/99999/summary')
				.set(getAdminAuthHeader());

			expect(response.status).toBe(404);
			expect(response.body.code).toBe('NOT_FOUND');
		});

		it('should support date range filtering', async () => {
			const response = await request(app)
				.get(
					`/api/analytics/users/${TEST_IDS.USER_1}/summary?start=2025-11-01&end=2025-11-30`
				)
				.set(getAdminAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});
	});
});
