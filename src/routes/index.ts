import { Router } from 'express';
import authRoutes from './auth.routes';
import roomsRoutes from './rooms.routes';
import bookingsRoutes from './bookings.routes';
import usersRoutes from './users.routes';
import testEmailRoutes from './testEmail.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

/**
 * Mount all API routes under /api
 */
router.use('/auth', authRoutes);
router.use('/rooms', roomsRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/users', usersRoutes);
router.use('/test-email', testEmailRoutes);
router.use('/analytics', analyticsRoutes);

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
	res.status(200).json({
		success: true,
		message: 'Conference Room Booking API is running',
		timestamp: new Date().toISOString(),
	});
});

export default router;
