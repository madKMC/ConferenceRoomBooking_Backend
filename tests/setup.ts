/**
 * Global test setup
 * Runs once before all tests
 */
import { testDb } from './helpers/testDb';

// Set test environment variables if not already set
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';

// Increase timeout for database operations
jest.setTimeout(30000);

/**
 * Setup hook - runs once before all test suites
 */
beforeAll(async () => {
	// Initialize test database connection
	await testDb.connect();
	
	// Create test database schema if needed
	await testDb.setupSchema();
});

/**
 * Teardown hook - runs once after all test suites
 */
afterAll(async () => {
	// Close database connection
	await testDb.disconnect();
});

/**
 * Clean database before each test suite
 */
beforeEach(async () => {
	// Clean all test data
	await testDb.cleanDatabase();
	
	// Seed with fresh test data
	await testDb.seedTestData();
});
