/**
 * Integration tests for Email endpoints
 * Tests: GET /test-email/verify, POST /test-email/send
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import { getAdminAuthHeader, getUserAuthHeader } from '../helpers/authHelper';

const app = createApp();

// Mock the mailer to prevent actual emails
jest.mock('../../src/lib/mailer', () => require('../mocks/mailer.mock'));

describe('Email Integration Tests', () => {
	describe('GET /api/test-email/verify', () => {
		it('should allow admin to verify SMTP config', async () => {
			const response = await request(app)
				.get('/api/test-email/verify')
				.set(getAdminAuthHeader());

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('success');
			expect(response.body).toHaveProperty('message');
		});

		it('should return 403 when user tries to verify', async () => {
			const response = await request(app)
				.get('/api/test-email/verify')
				.set(getUserAuthHeader());

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should return 401 without authentication', async () => {
			const response = await request(app).get('/api/test-email/verify');

			expect(response.status).toBe(401);
			expect(response.body.code).toBe('UNAUTHORIZED');
		});
	});

	describe('POST /api/test-email/send', () => {
		it('should allow admin to send test email', async () => {
			const response = await request(app)
				.post('/api/test-email/send')
				.set(getAdminAuthHeader())
				.send({
					to: 'test@example.com',
					subject: 'Test Subject',
					message: 'Test message content',
				});

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.message).toContain('sent successfully');
		});

		it('should return 403 when user tries to send test email', async () => {
			const response = await request(app)
				.post('/api/test-email/send')
				.set(getUserAuthHeader())
				.send({
					to: 'test@example.com',
					subject: 'Test Subject',
					message: 'Test message content',
				});

			expect(response.status).toBe(403);
			expect(response.body.code).toBe('FORBIDDEN');
		});

		it('should return 400 for missing required fields', async () => {
			const response = await request(app)
				.post('/api/test-email/send')
				.set(getAdminAuthHeader())
				.send({
					to: 'test@example.com',
					// Missing subject and message
				});

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
		});
	});
});
