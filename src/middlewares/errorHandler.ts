import { Request, Response, NextFunction } from 'express';
import { HttpError, InternalServerError } from '../utils/httpErrors';
import { logger } from '../utils/logger';

/**
 * Error response interface
 */
interface ErrorResponse {
	code: string;
	message: string;
	details?: any;
	correlationId?: string;
}

/**
 * Global error handling middleware
 * Catches all errors and formats them according to the standard error contract
 */
export function errorHandler(
	err: Error,
	req: Request,
	res: Response,
	next: NextFunction
): void {
	// If headers already sent, delegate to default Express handler
	if (res.headersSent) {
		return next(err);
	}

	const correlationId = req.correlationId;

	// Log the error
	logger.error('Request error', {
		correlationId,
		error: err.message,
		stack: err.stack,
		path: req.path,
		method: req.method,
	});

	// Handle known HTTP errors
	if (err instanceof HttpError) {
		const response: ErrorResponse = {
			code: err.code,
			message: err.message,
			correlationId,
		};

		if (err.details) {
			response.details = err.details;
		}

		res.status(err.statusCode).json(response);
		return;
	}

	// Handle unknown errors
	const internalError = new InternalServerError('An unexpected error occurred');

	const response: ErrorResponse = {
		code: internalError.code,
		message: internalError.message,
		correlationId,
	};

	res.status(500).json(response);
}
