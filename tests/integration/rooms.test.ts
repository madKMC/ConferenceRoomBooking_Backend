/**
 * Integration tests for Rooms endpoints
 * Tests: GET /rooms, POST /rooms, GET /rooms/:id, PATCH /rooms/:id, DELETE /rooms/:id,
 *        GET /rooms/:id/availability, GET /rooms/:id/bookings
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import { getAdminAuthHeader, getUserAuthHeader } from '../helpers/authHelper';
import { testDb, TEST_IDS } from '../helpers/testDb';

const app = createApp();

describe('Rooms Integration Tests', () => {
	describe('GET /api/rooms', () => {
		it('should list all active rooms with authentication', async () => {
			const response = await request(app)
				.get('/api/rooms')
				.set(getUserAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBeGreaterThan(0);
			expect(response.body.data[0]).toHaveProperty('id');
			expect(response.body.data[0]).toHaveProperty('name');
			expect(response.body.data[0]).toHaveProperty('capacity');
		});

		it('should filter rooms by capacity', async () => {
			const response = await request(app)
				.get('/api/rooms?capacity=10')
				.set(getUserAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			response.body.data.forEach((room: any) => {
				expect(room.capacity).toBeGreaterThanOrEqual(10);
			});
		});

		it('should filter rooms by floor', async () => {
			const response = await request(app)
				.get('/api/rooms?floor=3')
				.set(getUserAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			response.body.data.forEach((room: any) => {
				expect(room.floor).toBe(3);
			});
		});

		it('should support pagination with limit and offset', async () => {
			const response = await request(app)
				.get('/api/rooms?limit=2&offset=0')
				.set(getUserAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.length).toBeLessThanOrEqual(2);
		});

		it('should return 401 without token', async () => {
			const response = await request(app).get('/api/rooms');

			expect(response.status).toBe(401);
			expect(response.body.code).toBe('UNAUTHORIZED');
		});
	});

	describe('GET /api/rooms/:id', () => {
		it('should get single room details', async () => {
			const response = await request(app)
				.get(`/api/rooms/${TEST_IDS.ROOM_1}`)
				.set(getUserAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.id).toBe(TEST_IDS.ROOM_1);
			expect(response.body.data).toHaveProperty('name');
			expect(response.body.data).toHaveProperty('capacity');
		});

		it('should return 404 for non-existent room', async () => {
			const response = await request(app)
				.get('/api/rooms/99999')
				.set(getUserAuthHeader());

			expect(response.status).toBe(404);
			expect(response.body.code).toBe('NOT_FOUND');
		});
	});

	describe('GET /api/rooms/:id/availability', () => {
		it('should check availability with valid date', async () => {
			const response = await request(app)
				.get(`/api/rooms/${TEST_IDS.ROOM_1}/availability?date=2025-12-15`)
				.set(getUserAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty('room_id');
			expect(response.body.data).toHaveProperty('date');
			expect(Array.isArray(response.body.data.available_slots)).toBe(true);
		});

		it('should return 400 for missing date parameter', async () => {
			const response = await request(app)
				.get(`/api/rooms/${TEST_IDS.ROOM_1}/availability`)
				.set(getUserAuthHeader());

			expect(response.status).toBe(400);
		});

		it('should return 400 for invalid date format', async () => {
			const response = await request(app)
				.get(`/api/rooms/${TEST_IDS.ROOM_1}/availability?date=invalid-date`)
				.set(getUserAuthHeader());

			expect(response.status).toBe(400);
		});
	});

	describe('GET /api/rooms/:id/bookings', () => {
		beforeEach(async () => {
			// Create a test booking
			await testDb.createBooking({
				room_id: TEST_IDS.ROOM_1,
				user_id: TEST_IDS.USER_1,
				title: 'Test Booking',
				start_time: '2025-12-15 10:00:00',
				end_time: '2025-12-15 11:00:00',
				status: 'confirmed',
			});
		});

		it('should get room bookings for specific date', async () => {
			const response = await request(app)
				.get(`/api/rooms/${TEST_IDS.ROOM_1}/bookings?date=2025-12-15`)
				.set(getUserAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(Array.isArray(response.body.data)).toBe(true);
		});

		it('should return 400 for missing date parameter', async () => {
			const response = await request(app)
				.get(`/api/rooms/${TEST_IDS.ROOM_1}/bookings`)
				.set(getUserAuthHeader());

			expect(response.status).toBe(400);
		});
	});

	describe('POST /api/rooms', () => {
		it('should allow admin to create new room', async () => {
			const response = await request(app)
				.post('/api/rooms')
				.set(getAdminAuthHeader())
				.send({
					name: 'New Test Room',
					capacity: 15,
					floor: 4,
					description: 'A newly created test room',
					is_active: true,
				});

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty('id');
			expect(response.body.data.name).toBe('New Test Room');
		});

		it('should return 403 when user tries to create room', async () => {
			const response = await request(app)
				.post('/api/rooms')
				.set(getUserAuthHeader())
				.send({
					name: 'Unauthorized Room',
					capacity: 10,
					floor: 1,
				});

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should return 422 for invalid room data', async () => {
			const response = await request(app)
				.post('/api/rooms')
				.set(getAdminAuthHeader())
				.send({
					name: 'Invalid Room',
					capacity: -5, // Invalid capacity
					floor: 1,
				});

			expect(response.status).toBe(422);
			expect(response.body.code).toBe('VALIDATION_ERROR');
		});

		it('should return 422 for missing required fields', async () => {
			const response = await request(app)
				.post('/api/rooms')
				.set(getAdminAuthHeader())
				.send({
					name: 'Incomplete Room',
					// Missing capacity and floor
				});

			expect(response.status).toBe(422);
			expect(response.body.code).toBe('VALIDATION_ERROR');
		});
	});

	describe('PATCH /api/rooms/:id', () => {
		it('should allow admin to update room', async () => {
			const response = await request(app)
				.patch(`/api/rooms/${TEST_IDS.ROOM_1}`)
				.set(getAdminAuthHeader())
				.send({
					capacity: 25,
					description: 'Updated description',
				});

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.capacity).toBe(25);
		});

		it('should return 403 when user tries to update room', async () => {
			const response = await request(app)
				.patch(`/api/rooms/${TEST_IDS.ROOM_1}`)
				.set(getUserAuthHeader())
				.send({
					capacity: 30,
				});

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should return 404 for non-existent room', async () => {
			const response = await request(app)
				.patch('/api/rooms/99999')
				.set(getAdminAuthHeader())
				.send({
					capacity: 20,
				});

			expect(response.status).toBe(404);
			expect(response.body.code).toBe('NOT_FOUND');
		});
	});

	describe('DELETE /api/rooms/:id', () => {
		it('should allow admin to soft delete room', async () => {
			const response = await request(app)
				.delete(`/api/rooms/${TEST_IDS.ROOM_5}`)
				.set(getAdminAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.message).toContain('deleted');
		});

		it('should return 403 when user tries to delete room', async () => {
			const response = await request(app)
				.delete(`/api/rooms/${TEST_IDS.ROOM_1}`)
				.set(getUserAuthHeader());

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should return 404 for non-existent room', async () => {
			const response = await request(app)
				.delete('/api/rooms/99999')
				.set(getAdminAuthHeader());

			expect(response.status).toBe(404);
			expect(response.body.code).toBe('NOT_FOUND');
		});
	});
});
