/**
 * Unit tests for Auth Middleware
 * Tests: authenticate, requireRole, requireAdmin
 */
import { Request, Response, NextFunction } from 'express';
import { authenticate, requireRole, requireAdmin } from '../../../src/middlewares/auth';
import { generateUserToken, generateAdminToken, generateExpiredToken } from '../../helpers/authHelper';
import { TEST_IDS } from '../../helpers/testDb';

describe('Auth Middleware Unit Tests', () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let nextFunction: NextFunction;

	beforeEach(() => {
		mockRequest = {
			headers: {},
		};
		mockResponse = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};
		nextFunction = jest.fn();
	});

	describe('authenticate middleware', () => {
		it('should pass with valid token', () => {
			const token = generateUserToken(TEST_IDS.USER_1);
			mockRequest.headers = {
				authorization: `Bearer ${token}`,
			};

			authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

			expect(nextFunction).toHaveBeenCalledWith();
			expect(mockRequest.user).toBeDefined();
			expect(mockRequest.user?.userId).toBe(TEST_IDS.USER_1);
		});

		it('should reject request without token', () => {
			authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

			expect(nextFunction).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 401,
					code: 'UNAUTHORIZED',
				})
			);
		});

		it('should reject expired token', () => {
			const token = generateExpiredToken();
			mockRequest.headers = {
				authorization: `Bearer ${token}`,
			};

			authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

			expect(nextFunction).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 401,
					code: 'UNAUTHORIZED',
				})
			);
		});

		it('should reject malformed token', () => {
			mockRequest.headers = {
				authorization: 'Bearer invalid-token',
			};

			authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

			expect(nextFunction).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 401,
				})
			);
		});

		it('should reject token without Bearer prefix', () => {
			const token = generateUserToken();
			mockRequest.headers = {
				authorization: token, // Missing "Bearer " prefix
			};

			authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

			expect(nextFunction).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 401,
				})
			);
		});
	});

	describe('requireRole middleware', () => {
		it('should pass when user has required role', () => {
			mockRequest.user = {
				userId: TEST_IDS.USER_1,
				email: 'user1@test.com',
				role: 'user',
			};

			const middleware = requireRole('user');
			middleware(mockRequest as Request, mockResponse as Response, nextFunction);

			expect(nextFunction).toHaveBeenCalledWith();
		});

		it('should reject when user does not have required role', () => {
			mockRequest.user = {
				userId: TEST_IDS.USER_1,
				email: 'user1@test.com',
				role: 'user',
			};

			const middleware = requireRole('admin');
			middleware(mockRequest as Request, mockResponse as Response, nextFunction);

			expect(nextFunction).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 403,
					code: 'FORBIDDEN',
				})
			);
		});

		it('should reject when user is not authenticated', () => {
			const middleware = requireRole('user');
			middleware(mockRequest as Request, mockResponse as Response, nextFunction);

			expect(nextFunction).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 401,
					code: 'UNAUTHORIZED',
				})
			);
		});

		it('should accept multiple roles', () => {
			mockRequest.user = {
				userId: TEST_IDS.USER_1,
				email: 'user1@test.com',
				role: 'user',
			};

			const middleware = requireRole('user', 'admin');
			middleware(mockRequest as Request, mockResponse as Response, nextFunction);

			expect(nextFunction).toHaveBeenCalledWith();
		});
	});

	describe('requireAdmin middleware', () => {
		it('should pass for admin user', () => {
			mockRequest.user = {
				userId: TEST_IDS.ADMIN_USER,
				email: 'admin@test.com',
				role: 'admin',
			};

			requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

			expect(nextFunction).toHaveBeenCalledWith();
		});

		it('should reject regular user', () => {
			mockRequest.user = {
				userId: TEST_IDS.USER_1,
				email: 'user1@test.com',
				role: 'user',
			};

			requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction);

			expect(nextFunction).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 403,
					code: 'FORBIDDEN',
				})
			);
		});
	});
});
