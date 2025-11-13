import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to attach a unique correlation ID to each request
 * Used for request tracking and debugging
 */
export function correlationIdMiddleware(
	req: Request,
	res: Response,
	next: NextFunction
): void {
	req.correlationId = uuidv4();
	res.setHeader('X-Correlation-ID', req.correlationId);
	next();
}
