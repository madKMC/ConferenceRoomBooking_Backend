import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { TokenPayload } from '../domain/zod/auth.schema';

/**
 * JWT utility functions for token generation and verification
 */

/**
 * Generate a JWT token for a user
 */
export function signToken(payload: TokenPayload): string {
	return jwt.sign(payload, env.jwt.secret, {
		expiresIn: env.jwt.expiresIn,
	});
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload {
	return jwt.verify(token, env.jwt.secret) as TokenPayload;
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
	if (!authHeader) {
		return null;
	}

	const parts = authHeader.split(' ');
	if (parts.length !== 2 || parts[0] !== 'Bearer') {
		return null;
	}

	return parts[1];
}
