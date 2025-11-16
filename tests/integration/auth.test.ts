/**
 * Integration tests for Authentication endpoints
 * Tests: POST /auth/register, POST /auth/login, GET /auth/me
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import {
	generateAdminToken,
	generateUserToken,
	generateExpiredToken,
	generateInvalidSignatureToken,
	TEST_CREDENTIALS,
} from '../helpers/authHelper';
import { testDb } from '../helpers/testDb';

const app = createApp();

describe('Authentication Integration Tests', () => {
	describe('POST /api/auth/register', () => {
		it('should successfully register a new user', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					email: 'newuser@test.com',
					password: 'SecurePass123!',
					first_name: 'New',
					last_name: 'User',
					phone: '+1-555-9999',
				});

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty('token');
			expect(response.body.data).toHaveProperty('user');
			expect(response.body.data.user.email).toBe('newuser@test.com');
			expect(response.body.data.user.role).toBe('user');
			expect(response.body.data.user).not.toHaveProperty('password_hash');
		});

		it('should return 409 for duplicate email', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					email: 'user1@test.com', // Already exists
					password: 'SecurePass123!',
					first_name: 'Duplicate',
					last_name: 'User',
				});

			expect(response.status).toBe(409);
			expect(response.body.code).toBe('CONFLICT');
		});

		it('should return 422 for invalid email format', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					email: 'invalid-email',
					password: 'SecurePass123!',
					first_name: 'Test',
					last_name: 'User',
				});

			expect(response.status).toBe(422);
			expect(response.body.code).toBe('VALIDATION_ERROR');
		});

		it('should return 422 for weak password', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					email: 'weakpass@test.com',
					password: '123',
					first_name: 'Test',
					last_name: 'User',
				});

			expect(response.status).toBe(422);
			expect(response.body.code).toBe('VALIDATION_ERROR');
		});

		it('should return 422 for missing required fields', async () => {
			const response = await request(app)
				.post('/api/auth/register')
				.send({
					email: 'incomplete@test.com',
					// Missing password, first_name, last_name
				});

			expect(response.status).toBe(422);
			expect(response.body.code).toBe('VALIDATION_ERROR');
		});
	});

	describe('POST /api/auth/login', () => {
		it('should successfully login with valid credentials', async () => {
			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: TEST_CREDENTIALS.user1.email,
					password: TEST_CREDENTIALS.user1.password,
				});

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty('token');
			expect(response.body.data).toHaveProperty('user');
			expect(response.body.data.user.email).toBe(TEST_CREDENTIALS.user1.email);
			expect(response.body.data.user).not.toHaveProperty('password_hash');
		});

		it('should return 401 for wrong password', async () => {
			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: TEST_CREDENTIALS.user1.email,
					password: 'wrongpassword',
				});

			expect(response.status).toBe(401);
			expect(response.body.code).toBe('UNAUTHORIZED');
		});

		it('should return 401 for non-existent user', async () => {
			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: 'nonexistent@test.com',
					password: 'password123',
				});

			expect(response.status).toBe(401);
			expect(response.body.code).toBe('UNAUTHORIZED');
		});

		it('should return 422 for missing credentials', async () => {
			const response = await request(app)
				.post('/api/auth/login')
				.send({
					email: TEST_CREDENTIALS.user1.email,
					// Missing password
				});

			expect(response.status).toBe(422);
			expect(response.body.code).toBe('VALIDATION_ERROR');
		});
	});

	describe('GET /api/auth/me', () => {
		it('should return current user with valid token', async () => {
			const token = generateUserToken(TEST_CREDENTIALS.user1.id);
			const response = await request(app)
				.get('/api/auth/me')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.email).toBe(TEST_CREDENTIALS.user1.email);
			expect(response.body.data).not.toHaveProperty('password_hash');
		});

		it('should return 401 without token', async () => {
			const response = await request(app).get('/api/auth/me');

			expect(response.status).toBe(401);
			expect(response.body.code).toBe('UNAUTHORIZED');
		});

		it('should return 401 with expired token', async () => {
			const token = generateExpiredToken();
			const response = await request(app)
				.get('/api/auth/me')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(401);
			expect(response.body.code).toBe('UNAUTHORIZED');
		});

		it('should return 401 with invalid token signature', async () => {
			const token = generateInvalidSignatureToken();
			const response = await request(app)
				.get('/api/auth/me')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(401);
			expect(response.body.code).toBe('UNAUTHORIZED');
		});

		it('should return 401 with malformed token', async () => {
			const response = await request(app)
				.get('/api/auth/me')
				.set('Authorization', 'Bearer invalid-token-format');

			expect(response.status).toBe(401);
			expect(response.body.code).toBe('UNAUTHORIZED');
		});
	});
});
