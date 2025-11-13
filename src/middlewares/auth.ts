import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { HttpError } from '../utils/httpErrors';

/**
 * Middleware to verify JWT token and attach user to request
 */
export function authenticate(
	req: Request,
	res: Response,
	next: NextFunction
): void {
	try {
		const token = extractTokenFromHeader(req.headers.authorization);

		if (!token) {
			throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
		}

		const payload = verifyToken(token);
		req.user = payload;

		next();
	} catch (error) {
		if (error instanceof HttpError) {
			next(error);
		} else {
			next(new HttpError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
		}
	}
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(...roles: string[]) {
	return (req: Request, res: Response, next: NextFunction): void => {
		if (!req.user) {
			return next(
				new HttpError(401, 'UNAUTHORIZED', 'Authentication required')
			);
		}

		if (!roles.includes(req.user.role)) {
			return next(new HttpError(403, 'FORBIDDEN', 'Insufficient permissions'));
		}

		next();
	};
}

/**
 * Optional authentication - attach user if token present, but don't require it
 */
export function optionalAuth(
	req: Request,
	res: Response,
	next: NextFunction
): void {
	try {
		const token = extractTokenFromHeader(req.headers.authorization);

		if (token) {
			const payload = verifyToken(token);
			req.user = payload;
		}

		next();
	} catch (error) {
		// Token invalid, but continue without user
		next();
	}
}
