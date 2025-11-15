import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailOptions {
	to: string | string[];
	subject: string;
	html: string;
	text?: string;
}

/**
 * Get SMTP transporter configured from environment variables
 */
function getTransporter() {
	const config = {
		host: process.env.SMTP_HOST,
		port: parseInt(process.env.SMTP_PORT || '587'),
		secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS,
		},
	};

	// Validate SMTP configuration
	if (!config.host || !config.auth.user || !config.auth.pass) {
		throw new Error(
			'SMTP configuration missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env'
		);
	}

	return nodemailer.createTransport(config);
}

/**
 * Send an email via remote SMTP server
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
	try {
		const transporter = getTransporter();
		const from = process.env.SMTP_FROM || process.env.SMTP_USER;

		if (!from) {
			throw new Error('SMTP_FROM or SMTP_USER must be set in .env');
		}

		const mailOptions = {
			from,
			to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
			subject: options.subject,
			html: options.html,
			text: options.text || stripHtml(options.html),
		};

		const info = await transporter.sendMail(mailOptions);

		logger.info('Email sent successfully', {
			messageId: info.messageId,
			to: mailOptions.to,
			subject: options.subject,
		});
	} catch (error) {
		logger.error('Failed to send email', {
			error: error instanceof Error ? error.message : 'Unknown error',
			to: options.to,
			subject: options.subject,
		});
		throw error;
	}
}

/**
 * Simple HTML to text converter for fallback
 */
function stripHtml(html: string): string {
	return html
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.trim();
}

/**
 * Verify SMTP connection (useful for testing)
 */
export async function verifySmtpConnection(): Promise<boolean> {
	try {
		const transporter = getTransporter();
		await transporter.verify();
		logger.info('SMTP connection verified successfully');
		return true;
	} catch (error) {
		logger.error('SMTP connection failed', {
			error: error instanceof Error ? error.message : 'Unknown error',
		});
		return false;
	}
}
