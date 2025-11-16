/**
 * Unit tests for Correlation ID Middleware
 * Tests UUID v4 generation and attachment to request
 */
import { Request, Response, NextFunction } from 'express';
import { correlationIdMiddleware } from '../../../src/middlewares/correlationId';

describe('Correlation ID Middleware Unit Tests', () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let nextFunction: NextFunction;

	beforeEach(() => {
		mockRequest = {};
		mockResponse = {};
		nextFunction = jest.fn();
	});

	it('should generate and attach a UUID v4 correlation ID', () => {
		correlationIdMiddleware(
			mockRequest as Request,
			mockResponse as Response,
			nextFunction
		);

		expect(mockRequest.correlationId).toBeDefined();
		expect(typeof mockRequest.correlationId).toBe('string');
		expect(mockRequest.correlationId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		);
	});

	it('should call next function', () => {
		correlationIdMiddleware(
			mockRequest as Request,
			mockResponse as Response,
			nextFunction
		);

		expect(nextFunction).toHaveBeenCalledTimes(1);
		expect(nextFunction).toHaveBeenCalledWith();
	});

	it('should generate unique IDs for multiple requests', () => {
		const request1: Partial<Request> = {};
		const request2: Partial<Request> = {};

		correlationIdMiddleware(
			request1 as Request,
			mockResponse as Response,
			nextFunction
		);
		correlationIdMiddleware(
			request2 as Request,
			mockResponse as Response,
			nextFunction
		);

		expect(request1.correlationId).not.toBe(request2.correlationId);
	});
});
