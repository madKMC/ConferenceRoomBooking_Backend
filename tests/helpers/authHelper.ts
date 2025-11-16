/**
 * Authentication helper for tests
 * Provides utilities for generating JWT tokens and authentication headers
 */
import jwt from 'jsonwebtoken';
import { TEST_IDS } from './testDb';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
const JWT_EXPIRES_IN = '1h';

interface TokenPayload {
	userId: number;
	email: string;
	role: string;
}

/**
 * Generate JWT token for a user
 */
export function generateToken(payload: TokenPayload): string {
	return jwt.sign(payload, JWT_SECRET, {
		expiresIn: JWT_EXPIRES_IN,
	});
}

/**
 * Generate admin token
 */
export function generateAdminToken(): string {
	return generateToken({
		userId: TEST_IDS.ADMIN_USER,
		email: 'admin@test.com',
		role: 'admin',
	});
}

/**
 * Generate user token
 */
export function generateUserToken(userId: number = TEST_IDS.USER_1): string {
	const userEmails: Record<number, string> = {
		[TEST_IDS.USER_1]: 'user1@test.com',
		[TEST_IDS.USER_2]: 'user2@test.com',
		[TEST_IDS.USER_3]: 'user3@test.com',
		[TEST_IDS.USER_4]: 'user4@test.com',
		[TEST_IDS.USER_5]: 'user5@test.com',
	};

	return generateToken({
		userId: userId,
		email: userEmails[userId] || `user${userId}@test.com`,
		role: 'user',
	});
}

/**
 * Generate expired token
 */
export function generateExpiredToken(): string {
	return jwt.sign(
		{
			userId: TEST_IDS.USER_1,
			email: 'user1@test.com',
			role: 'user',
		},
		JWT_SECRET,
		{
			expiresIn: '-1h', // Expired 1 hour ago
		}
	);
}

/**
 * Generate token with invalid signature
 */
export function generateInvalidSignatureToken(): string {
	return jwt.sign(
		{
			userId: TEST_IDS.USER_1,
			email: 'user1@test.com',
			role: 'user',
		},
		'wrong-secret-key',
		{
			expiresIn: '1h',
		}
	);
}

/**
 * Get authorization header with admin token
 */
export function getAdminAuthHeader(): { Authorization: string } {
	return {
		Authorization: `Bearer ${generateAdminToken()}`,
	};
}

/**
 * Get authorization header with user token
 */
export function getUserAuthHeader(userId: number = TEST_IDS.USER_1): { Authorization: string } {
	return {
		Authorization: `Bearer ${generateUserToken(userId)}`,
	};
}

/**
 * Test user credentials
 */
export const TEST_CREDENTIALS = {
	admin: {
		email: 'admin@test.com',
		password: 'admin123',
		id: TEST_IDS.ADMIN_USER,
		role: 'admin',
	},
	user1: {
		email: 'user1@test.com',
		password: 'password123',
		id: TEST_IDS.USER_1,
		role: 'user',
	},
	user2: {
		email: 'user2@test.com',
		password: 'password123',
		id: TEST_IDS.USER_2,
		role: 'user',
	},
	user3: {
		email: 'user3@test.com',
		password: 'password123',
		id: TEST_IDS.USER_3,
		role: 'user',
	},
};
