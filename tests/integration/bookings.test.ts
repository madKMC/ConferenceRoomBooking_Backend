/**
 * Integration tests for Bookings endpoints
 * Tests: POST /bookings, GET /bookings, GET /bookings/:id, PATCH /bookings/:id, DELETE /bookings/:id
 * Includes concurrency, transaction, and datetime format tests
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import { getAdminAuthHeader, getUserAuthHeader } from '../helpers/authHelper';
import { testDb, TEST_IDS } from '../helpers/testDb';

const app = createApp();

describe('Bookings Integration Tests', () => {
	describe('POST /api/bookings - Core Operations', () => {
		it('should create valid booking', async () => {
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					room_id: TEST_IDS.ROOM_1,
					title: 'Team Meeting',
					description: 'Weekly sync',
					start_time: '2025-12-20T10:00:00',
					end_time: '2025-12-20T11:00:00',
				});

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty('id');
			expect(response.body.data.title).toBe('Team Meeting');
		});

		it('should return 409 when room already booked', async () => {
			// Create first booking
			await testDb.createBooking({
				room_id: TEST_IDS.ROOM_1,
				user_id: TEST_IDS.USER_1,
				title: 'Existing Booking',
				start_time: '2025-12-21 10:00:00',
				end_time: '2025-12-21 11:00:00',
				status: 'confirmed',
			});

			// Try to create overlapping booking
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_2))
				.send({
					room_id: TEST_IDS.ROOM_1,
					title: 'Conflicting Booking',
					start_time: '2025-12-21T10:30:00',
					end_time: '2025-12-21T11:30:00',
				});

			expect(response.status).toBe(409);
			expect(response.body.code).toBe('CONFLICT');
		});

		it('should reject booking before 9:00 AM', async () => {
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					room_id: TEST_IDS.ROOM_1,
					title: 'Early Meeting',
					start_time: '2025-12-22T08:00:00',
					end_time: '2025-12-22T09:00:00',
				});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe('BAD_REQUEST');
		});

		it('should reject booking after 5:00 PM', async () => {
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					room_id: TEST_IDS.ROOM_1,
					title: 'Late Meeting',
					start_time: '2025-12-22T16:00:00',
					end_time: '2025-12-22T18:00:00',
				});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe('BAD_REQUEST');
		});

		it('should reject booking with duration less than 30 minutes', async () => {
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					room_id: TEST_IDS.ROOM_1,
					title: 'Short Meeting',
					start_time: '2025-12-22T10:00:00',
					end_time: '2025-12-22T10:15:00',
				});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe('BAD_REQUEST');
		});

		it('should reject booking with duration more than 4 hours', async () => {
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					room_id: TEST_IDS.ROOM_1,
					title: 'Long Meeting',
					start_time: '2025-12-22T09:00:00',
					end_time: '2025-12-22T14:00:00',
				});

			expect(response.status).toBe(400);
			expect(response.body.code).toBe('BAD_REQUEST');
		});

		it('should return 404 for invalid room_id', async () => {
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					room_id: 99999,
					title: 'Invalid Room',
					start_time: '2025-12-22T10:00:00',
					end_time: '2025-12-22T11:00:00',
				});

			expect(response.status).toBe(404);
			expect(response.body.code).toBe('NOT_FOUND');
		});

		it('should return 422 for missing required fields', async () => {
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					room_id: TEST_IDS.ROOM_1,
					// Missing title, start_time, end_time
				});

			expect(response.status).toBe(422);
			expect(response.body.code).toBe('VALIDATION_ERROR');
		});
	});

	describe('POST /api/bookings - DateTime Format Support', () => {
		it('should accept ISO 8601 without timezone', async () => {
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					room_id: TEST_IDS.ROOM_2,
					title: 'ISO Format Test',
					start_time: '2025-12-23T10:00:00',
					end_time: '2025-12-23T11:00:00',
				});

			expect(response.status).toBe(201);
		});

		it('should accept UTC format', async () => {
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					room_id: TEST_IDS.ROOM_2,
					title: 'UTC Format Test',
					start_time: '2025-12-24T10:00:00Z',
					end_time: '2025-12-24T11:00:00Z',
				});

			expect(response.status).toBe(201);
		});

		it('should accept format with milliseconds', async () => {
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					room_id: TEST_IDS.ROOM_2,
					title: 'Milliseconds Format Test',
					start_time: '2025-12-25T10:00:00.000Z',
					end_time: '2025-12-25T11:00:00.000Z',
				});

			expect(response.status).toBe(201);
		});

		it('should accept format with timezone offset', async () => {
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					room_id: TEST_IDS.ROOM_2,
					title: 'Timezone Offset Test',
					start_time: '2025-12-26T10:00:00+02:00',
					end_time: '2025-12-26T11:00:00+02:00',
				});

			expect(response.status).toBe(201);
		});

		it('should reject invalid datetime format', async () => {
			const response = await request(app)
				.post('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					room_id: TEST_IDS.ROOM_2,
					title: 'Invalid Format Test',
					start_time: 'invalid-date',
					end_time: '2025-12-27T11:00:00',
				});

			expect(response.status).toBe(422);
		});
	});

	describe('GET /api/bookings', () => {
		beforeEach(async () => {
			// Create test bookings
			await testDb.createBooking({
				room_id: TEST_IDS.ROOM_1,
				user_id: TEST_IDS.USER_1,
				title: 'Booking 1',
				start_time: '2025-12-15 10:00:00',
				end_time: '2025-12-15 11:00:00',
				status: 'confirmed',
			});
			await testDb.createBooking({
				room_id: TEST_IDS.ROOM_2,
				user_id: TEST_IDS.USER_2,
				title: 'Booking 2',
				start_time: '2025-12-15 14:00:00',
				end_time: '2025-12-15 15:00:00',
				status: 'pending',
			});
		});

		it('should allow admin to get all bookings', async () => {
			const response = await request(app)
				.get('/api/bookings')
				.set(getAdminAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(Array.isArray(response.body.data)).toBe(true);
		});

		it('should return 403 when user tries to list all bookings', async () => {
			const response = await request(app)
				.get('/api/bookings')
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should filter by status', async () => {
			const response = await request(app)
				.get('/api/bookings?status=confirmed')
				.set(getAdminAuthHeader());

			expect(response.status).toBe(200);
			response.body.data.forEach((booking: any) => {
				expect(booking.status).toBe('confirmed');
			});
		});

		it('should filter by room_id', async () => {
			const response = await request(app)
				.get(`/api/bookings?room_id=${TEST_IDS.ROOM_1}`)
				.set(getAdminAuthHeader());

			expect(response.status).toBe(200);
			response.body.data.forEach((booking: any) => {
				expect(booking.room_id).toBe(TEST_IDS.ROOM_1);
			});
		});

		it('should filter by date', async () => {
			const response = await request(app)
				.get('/api/bookings?date=2025-12-15')
				.set(getAdminAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});
	});

	describe('GET /api/bookings/:id', () => {
		let bookingId: number;

		beforeEach(async () => {
			bookingId = await testDb.createBooking({
				room_id: TEST_IDS.ROOM_1,
				user_id: TEST_IDS.USER_1,
				title: 'Test Booking',
				start_time: '2025-12-16 10:00:00',
				end_time: '2025-12-16 11:00:00',
			});
		});

		it('should allow owner to get own booking', async () => {
			const response = await request(app)
				.get(`/api/bookings/${bookingId}`)
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.id).toBe(bookingId);
		});

		it('should allow invitee to get booking they are invited to', async () => {
			// Add invitation
			await testDb.createInvitation({
				booking_id: bookingId,
				user_id: TEST_IDS.USER_2,
				status: 'accepted',
			});

			const response = await request(app)
				.get(`/api/bookings/${bookingId}`)
				.set(getUserAuthHeader(TEST_IDS.USER_2));

			expect(response.status).toBe(200);
			expect(response.body.data.id).toBe(bookingId);
		});

		it('should return 403 when user tries to view others booking', async () => {
			const response = await request(app)
				.get(`/api/bookings/${bookingId}`)
				.set(getUserAuthHeader(TEST_IDS.USER_3));

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should return 404 for non-existent booking', async () => {
			const response = await request(app)
				.get('/api/bookings/99999')
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(404);
			expect(response.body.code).toBe('NOT_FOUND');
		});
	});

	describe('PATCH /api/bookings/:id', () => {
		let bookingId: number;

		beforeEach(async () => {
			bookingId = await testDb.createBooking({
				room_id: TEST_IDS.ROOM_1,
				user_id: TEST_IDS.USER_1,
				title: 'Original Title',
				start_time: '2025-12-17 10:00:00',
				end_time: '2025-12-17 11:00:00',
			});
		});

		it('should allow owner to update own booking', async () => {
			const response = await request(app)
				.patch(`/api/bookings/${bookingId}`)
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					title: 'Updated Title',
					description: 'Updated description',
				});

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.title).toBe('Updated Title');
		});

		it('should return 409 when update causes conflict', async () => {
			// Create another booking
			await testDb.createBooking({
				room_id: TEST_IDS.ROOM_1,
				user_id: TEST_IDS.USER_2,
				title: 'Conflicting Booking',
				start_time: '2025-12-17 14:00:00',
				end_time: '2025-12-17 15:00:00',
			});

			// Try to update first booking to conflict with second
			const response = await request(app)
				.patch(`/api/bookings/${bookingId}`)
				.set(getUserAuthHeader(TEST_IDS.USER_1))
				.send({
					start_time: '2025-12-17T14:30:00',
					end_time: '2025-12-17T15:30:00',
				});

			expect(response.status).toBe(409);
			expect(response.body.code).toBe('CONFLICT');
		});

		it('should return 403 when user tries to update others booking', async () => {
			const response = await request(app)
				.patch(`/api/bookings/${bookingId}`)
				.set(getUserAuthHeader(TEST_IDS.USER_2))
				.send({
					title: 'Unauthorized Update',
				});

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});
	});

	describe('DELETE /api/bookings/:id', () => {
		let bookingId: number;

		beforeEach(async () => {
			bookingId = await testDb.createBooking({
				room_id: TEST_IDS.ROOM_1,
				user_id: TEST_IDS.USER_1,
				title: 'To Be Cancelled',
				start_time: '2025-12-18 10:00:00',
				end_time: '2025-12-18 11:00:00',
			});
		});

		it('should allow owner to cancel own booking', async () => {
			const response = await request(app)
				.delete(`/api/bookings/${bookingId}`)
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});

		it('should return 403 when user tries to cancel others booking', async () => {
			const response = await request(app)
				.delete(`/api/bookings/${bookingId}`)
				.set(getUserAuthHeader(TEST_IDS.USER_2));

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should return 404 for non-existent booking', async () => {
			const response = await request(app)
				.delete('/api/bookings/99999')
				.set(getUserAuthHeader(TEST_IDS.USER_1));

			expect(response.status).toBe(404);
			expect(response.body.code).toBe('NOT_FOUND');
		});
	});

	describe('Concurrency & Transaction Tests', () => {
		it('should handle concurrent booking attempts - only one should succeed', async () => {
			const promises = Array(5)
				.fill(null)
				.map((_, i) =>
					request(app)
						.post('/api/bookings')
						.set(getUserAuthHeader(TEST_IDS.USER_1 + (i % 3)))
						.send({
							room_id: TEST_IDS.ROOM_3,
							title: `Concurrent Booking ${i}`,
							start_time: '2025-12-19T10:00:00',
							end_time: '2025-12-19T11:00:00',
						})
				);

			const responses = await Promise.all(promises);
			const successCount = responses.filter((r) => r.status === 201).length;
			const conflictCount = responses.filter((r) => r.status === 409).length;

			expect(successCount).toBe(1);
			expect(conflictCount).toBe(4);
		});
	});
});
