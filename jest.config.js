/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests'],
	testMatch: ['**/*.test.ts'],
	moduleFileExtensions: ['ts', 'js', 'json'],
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'!src/server.ts',
		'!src/types/**',
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
	testTimeout: 30000,
	verbose: true,
	forceExit: true,
	clearMocks: true,
	resetMocks: true,
	restoreMocks: true,
	globals: {
		'ts-jest': {
			tsconfig: {
				noUnusedLocals: false,
				noUnusedParameters: false,
			},
		},
	},
};
