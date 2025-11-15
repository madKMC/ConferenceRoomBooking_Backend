import { Router } from 'express';
import { verifySmtpConnection, sendEmail } from '../lib/mailer';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

/**
 * GET /api/test-email/verify
 * Verify SMTP connection (admin only)
 */
router.get(
	'/verify',
	authenticate,
	requireRole('admin'),
	async (_req, res, next) => {
		try {
			const isConnected = await verifySmtpConnection();

			res.status(200).json({
				success: isConnected,
				message: isConnected
					? 'SMTP connection verified successfully'
					: 'SMTP connection failed - check your configuration',
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/test-email/send
 * Send a test email (admin only)
 */
router.post(
	'/send',
	authenticate,
	requireRole('admin'),
	async (req, res, next) => {
		try {
			const { to, subject, message } = req.body;

			if (!to || !subject || !message) {
				res.status(400).json({
					success: false,
					message: 'Missing required fields: to, subject, message',
				});
				return;
			}
			const html = `
<!DOCTYPE html>
<html>
<head>
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px; }
		.content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 5px; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>🧪 Test Email</h1>
		</div>
		<div class="content">
			<p>${message}</p>
			<hr>
			<p style="color: #777; font-size: 12px;">This is a test email from the Conference Room Booking System.</p>
		</div>
	</div>
</body>
</html>
		`;

			await sendEmail({ to, subject, html });

			res.status(200).json({
				success: true,
				message: `Test email sent successfully to ${to}`,
			});
		} catch (error) {
			next(error);
		}
	}
);

export default router;
