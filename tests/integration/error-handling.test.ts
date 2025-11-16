/**
 * Integration tests for Error Handling
 * Tests various error scenarios and response formats
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import {
	getUserAuthHeader,
	generateExpiredToken,
	generateInvalidSignatureToken,
} from '../helpers/authHelper';
import { testDb, TEST_IDS } from '../helpers/testDb';

const app = createApp();

describe('Error Handling Integration Tests', () => {
	describe('400 Bad Request', () => {
		it('should return 400 for invalid query parameters', async () => {
			const response = await request(app)
				.get(`/api/rooms/${TEST_IDS.ROOM_1}/availability?date=invalid-date`)
				.set(getUserAuthHeader());

			expect(response.status).toBe(400);
			expect(response.body.code).toBe('BAD_REQUEST');
			expect(response.body).toHaveProperty('correlationId');
		});
	});

	describe('401 Unauthorized', () => {
		it('should return 401 for missing JWT token', async () => {
			const response = await request(app).get('/api/rooms');

			expect(response.status).toBe(401);
			expect(response.body.code).toBe('UNAUTHORIZED');
			expect(response.body).toHaveProperty('message');
			expect(response.body).toHaveProperty('correlationId');
		});

		it('should return 401 for expired JWT token', async () => {
			const token = generateExpiredToken();
			const response = await request(app)
				.get('/api/rooms')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(401);
			expect(response.body.code).toBe('UNAUTHORIZED');
		});

		it('should return 401 for invalid token signature', async () => {
			const token = generateInvalidSignatureToken();
			const response = await request(app)
				.get('/api/rooms')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(401);
			expect(response.body.code).toBe('UNAUTHORIZED');
		});
	});

	describe('403 Forbidden', () => {
		it('should return 403 for insufficient role permissions', async () => {
			const response = await request(app)
				.post('/api/rooms')
				.set(getUserAuthHeader())
				.send({
					name: 'Test Room',
					capacity: 10,
					floor: 1,
				});

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
			expect(response.body).toHaveProperty('message');
		});
	});

	describe('404 Not Found', () => {
		it('should return 404 when resource does not exist', async () => {
			const response = await request(app)
				.get('/api/rooms/99999')
				.set(getUserAuthHeader());

			expect(response.status).toBe(404);
			expect(response.body.code).toBe('NOT_FOUND');
			expect(response.body).toHaveProperty('message');
		});

		it('should return 404 for non-existent route', async () => {
			const response = await request(app).get('/api/nonexistent-route');

			expect(response.status).toBe(404);
			expect(response.body.code).toBe('NOT_FOUND');
		});
	});

	describe('409 Conflict', () => {
		it('should return 409 for double booking attempt', async () => {
			// Create first booking
			await testDb.createBooking({
				room_id: TEST_IDS.ROOM_1,
				user_id: TEST_IDS.USER_1,
				title: 'First Booking',
				start_time: '2025-12-25 10:00:00',
				end_time: '2025-12-25 11:00:00',
			});

			// Try to create overlapping booking
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_2))
				.send({
					room_id: TEST_IDS.ROOM_1,
					title: 'Conflicting Booking',
					start_time: '2025-12-25T10:30:00',
					end_time: '2025-12-25T11:30:00',
				});

			expect(response.status).toBe(409);
			expect(response.body.code).toBe('CONFLICT');
			expect(response.body).toHaveProperty('message');
		});

		it('should return 409 for duplicate email registration', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					email: 'user1@test.com', // Already exists
					password: 'Password123!',
					first_name: 'Duplicate',
					last_name: 'User',
				});

			expect(response.status).toBe(409);
			expect(response.body.code).toBe('CONFLICT');
		});
	});

	describe('422 Validation Error', () => {
		it('should return 422 for Zod schema validation failures', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					email: 'invalid-email', // Invalid email format
					password: '123', // Too short
					first_name: 'Test',
					last_name: 'User',
				});

			expect(response.status).toBe(422);
			expect(response.body.code).toBe('VALIDATION_ERROR');
			expect(response.body).toHaveProperty('message');
		});

		it('should return 422 for missing required fields', async () => {
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader())
				.send({
					room_id: TEST_IDS.ROOM_1,
					// Missing title, start_time, end_time
				});

			expect(response.status).toBe(422);
			expect(response.body.code).toBe('VALIDATION_ERROR');
		});
	});

	describe('Error Response Format Consistency', () => {
		it('should have consistent error format with correlationId', async () => {
			const response = await request(app).get('/api/rooms/99999').set(getUserAuthHeader());

			expect(response.body).toHaveProperty('code');
			expect(response.body).toHaveProperty('message');
			expect(response.body).toHaveProperty('correlationId');
			expect(typeof response.body.correlationId).toBe('string');
		});

		it('should include correlationId in all error responses', async () => {
			const responses = await Promise.all([
				request(app).get('/api/rooms'), // 401
				request(app).get('/api/rooms/99999').set(getUserAuthHeader()), // 404
				request(app).post('/api/rooms').set(getUserAuthHeader()).send({}), // 403
			]);

			responses.forEach((response) => {
				expect(response.body).toHaveProperty('correlationId');
				expect(response.body.correlationId).toMatch(
					/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
				);
			});
		});
	});
});
