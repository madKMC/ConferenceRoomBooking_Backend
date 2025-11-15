/**
 * Custom HTTP error classes for standardized error handling
 */

export class HttpError extends Error {
	constructor(
		public statusCode: number,
		public code: string,
		message: string,
		public details?: any
	) {
		super(message);
		this.name = 'HttpError';
		Error.captureStackTrace(this, this.constructor);
	}
}

export class BadRequestError extends HttpError {
	constructor(message: string = 'Bad request', details?: any) {
		super(400, 'BAD_REQUEST', message, details);
		this.name = 'BadRequestError';
	}
}

export class NotFoundError extends HttpError {
	constructor(message: string = 'Resource not found', details?: any) {
		super(404, 'NOT_FOUND', message, details);
		this.name = 'NotFoundError';
	}
}

export class ConflictError extends HttpError {
	constructor(message: string = 'Conflict', details?: any) {
		super(409, 'CONFLICT', message, details);
		this.name = 'ConflictError';
	}
}

export class ForbiddenError extends HttpError {
	constructor(message: string = 'Forbidden', details?: any) {
		super(403, 'FORBIDDEN', message, details);
		this.name = 'ForbiddenError';
	}
}

export class ValidationError extends HttpError {
	constructor(message: string = 'Validation failed', details?: any) {
		super(422, 'VALIDATION_ERROR', message, details);
		this.name = 'ValidationError';
	}
}

export class InternalServerError extends HttpError {
	constructor(message: string = 'Internal server error', details?: any) {
		super(500, 'INTERNAL_SERVER_ERROR', message, details);
		this.name = 'InternalServerError';
	}
}
