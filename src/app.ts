import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { correlationIdMiddleware } from './middlewares/correlationId';
import { errorHandler } from './middlewares/errorHandler';
import routes from './routes';
import { logger } from './utils/logger';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
	const app = express();

	// CORS middleware - Allow frontend access
	app.use(
		cors({
			origin: ['http://localhost:5173', 'http://localhost:3000'],
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		})
	);

	// Body parsing middleware
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	// Attach correlation ID to all requests
	app.use(correlationIdMiddleware);

	// Request logging
	app.use((req: Request, res: Response, next) => {
		logger.info('Incoming request', {
			method: req.method,
			path: req.path,
			correlationId: req.correlationId,
		});
		next();
	});

	// Mount API routes under /api
	app.use('/api', routes);

	// Root endpoint
	app.get('/', (req: Request, res: Response) => {
		res.status(200).json({
			message: 'Conference Room Booking API',
			version: '1.0.0',
			documentation: '/api/health',
		});
	});

	// 404 handler
	app.use((req: Request, res: Response) => {
		res.status(404).json({
			code: 'NOT_FOUND',
			message: 'Route not found',
			path: req.path,
			correlationId: req.correlationId,
		});
	});

	// Global error handler (must be last)
	app.use(errorHandler);

	return app;
}
