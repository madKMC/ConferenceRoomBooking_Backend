import { createApp } from './app';
import { getPool, closePool } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';

/**
 * Start the server
 */
async function startServer() {
	try {
		// Test database connection
		const pool = getPool();
		await pool.query('SELECT 1');
		logger.info('Database connection established');

		// Create Express app
		const app = createApp();

		// Start listening
		const server = app.listen(env.port, () => {
			logger.info(`Server started`, {
				port: env.port,
				env: env.nodeEnv,
				timezone: env.timezone,
			});
		});

		// Graceful shutdown
		const shutdown = async (signal: string) => {
			logger.info(`${signal} received, shutting down gracefully`);

			server.close(async () => {
				logger.info('HTTP server closed');

				await closePool();
				logger.info('Database connections closed');

				process.exit(0);
			});

			// Force shutdown after 10 seconds
			setTimeout(() => {
				logger.error('Forced shutdown after timeout');
				process.exit(1);
			}, 10000);
		};

		process.on('SIGTERM', () => shutdown('SIGTERM'));
		process.on('SIGINT', () => shutdown('SIGINT'));
	} catch (error) {
		logger.error('Failed to start server', error);
		process.exit(1);
	}
}

startServer();
