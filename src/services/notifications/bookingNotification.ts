import { sendEmail } from '../../lib/mailer';
import { BookingWithRoom } from '../../domain/zod/bookings.schema';

interface BookingEmailData {
	userName: string;
	userEmail: string;
	booking: BookingWithRoom;
	ownerName: string;
}

/**
 * Send email when a user is invited to a booking
 */
export async function sendBookingInvitationEmail(data: BookingEmailData) {
	const { userName, userEmail, booking, ownerName } = data;

	const startTime = new Date(booking.start_time).toLocaleString('en-ZA', {
		dateStyle: 'full',
		timeStyle: 'short',
		timeZone: 'Africa/Johannesburg',
	});

	const endTime = new Date(booking.end_time).toLocaleTimeString('en-ZA', {
		timeStyle: 'short',
		timeZone: 'Africa/Johannesburg',
	});

	const subject = `Invitation: ${booking.title}`;

	const html = `
<!DOCTYPE html>
<html>
<head>
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
		.content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
		.booking-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
		.detail-row { margin: 8px 0; }
		.label { font-weight: bold; color: #555; }
		.footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
		.cta-button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 10px 5px; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>📅 You're Invited to a Booking</h1>
		</div>
		<div class="content">
			<p>Hi ${userName},</p>
			<p><strong>${ownerName}</strong> has invited you to a conference room booking.</p>
			
			<div class="booking-details">
				<h2>${booking.title}</h2>
				${booking.description ? `<p>${booking.description}</p>` : ''}
				
				<div class="detail-row">
					<span class="label">📍 Room:</span> ${booking.room_name} (Capacity: ${
		booking.room_capacity
	})
				</div>
				<div class="detail-row">
					<span class="label">🕐 When:</span> ${startTime} - ${endTime}
				</div>
				<div class="detail-row">
					<span class="label">👤 Organizer:</span> ${ownerName}
				</div>
			</div>
			
			<p>Please log in to the booking system to accept or decline this invitation.</p>
			
			<p style="margin-top: 30px;">
				<a href="${
					process.env.FRONTEND_URL || 'http://localhost:3000'
				}" class="cta-button">View Invitation</a>
			</p>
		</div>
		<div class="footer">
			<p>This is an automated message from the Conference Room Booking System.</p>
		</div>
	</div>
</body>
</html>
	`;

	const text = `
You're Invited to a Booking

Hi ${userName},

${ownerName} has invited you to a conference room booking.

Booking: ${booking.title}
${booking.description ? `Description: ${booking.description}\n` : ''}
Room: ${booking.room_name} (Capacity: ${booking.room_capacity})
When: ${startTime} - ${endTime}
Organizer: ${ownerName}

Please log in to the booking system to accept or decline this invitation.
	`;

	await sendEmail({
		to: userEmail,
		subject,
		html,
		text,
	});
}

/**
 * Send email when an invitee accepts a booking invitation
 */
export async function sendBookingAcceptedEmail(data: BookingEmailData) {
	const { userName, userEmail, booking, ownerName } = data;

	const startTime = new Date(booking.start_time).toLocaleString('en-ZA', {
		dateStyle: 'full',
		timeStyle: 'short',
		timeZone: 'Africa/Johannesburg',
	});

	const subject = `${userName} accepted: ${booking.title}`;

	const html = `
<!DOCTYPE html>
<html>
<head>
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
		.content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
		.booking-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2196F3; }
		.detail-row { margin: 8px 0; }
		.label { font-weight: bold; color: #555; }
		.footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>✅ Invitation Accepted</h1>
		</div>
		<div class="content">
			<p>Hi ${ownerName},</p>
			<p><strong>${userName}</strong> has accepted your booking invitation.</p>
			
			<div class="booking-details">
				<h2>${booking.title}</h2>
				<div class="detail-row">
					<span class="label">📍 Room:</span> ${booking.room_name}
				</div>
				<div class="detail-row">
					<span class="label">🕐 When:</span> ${startTime}
				</div>
				<div class="detail-row">
					<span class="label">✅ Accepted by:</span> ${userName}
				</div>
			</div>
			
			<p>Your booking is now confirmed with this attendee.</p>
		</div>
		<div class="footer">
			<p>This is an automated message from the Conference Room Booking System.</p>
		</div>
	</div>
</body>
</html>
	`;

	const text = `
Invitation Accepted

Hi ${ownerName},

${userName} has accepted your booking invitation.

Booking: ${booking.title}
Room: ${booking.room_name}
When: ${startTime}
Accepted by: ${userName}

Your booking is now confirmed with this attendee.
	`;

	await sendEmail({
		to: userEmail,
		subject,
		html,
		text,
	});
}

/**
 * Send email when a booking is cancelled (to all invitees who accepted)
 */
export async function sendBookingCancelledEmail(data: BookingEmailData) {
	const { userName, userEmail, booking, ownerName } = data;

	const startTime = new Date(booking.start_time).toLocaleString('en-ZA', {
		dateStyle: 'full',
		timeStyle: 'short',
		timeZone: 'Africa/Johannesburg',
	});

	const subject = `Cancelled: ${booking.title}`;

	const html = `
<!DOCTYPE html>
<html>
<head>
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
		.content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
		.booking-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f44336; }
		.detail-row { margin: 8px 0; }
		.label { font-weight: bold; color: #555; }
		.footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
		.warning { background-color: #fff3cd; padding: 12px; border-left: 4px solid #ff9800; margin: 15px 0; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>❌ Booking Cancelled</h1>
		</div>
		<div class="content">
			<p>Hi ${userName},</p>
			
			<div class="warning">
				<p><strong>⚠️ This booking has been cancelled.</strong></p>
			</div>
			
			<p>The following booking that you accepted has been cancelled by ${ownerName}.</p>
			
			<div class="booking-details">
				<h2>${booking.title}</h2>
				${booking.description ? `<p>${booking.description}</p>` : ''}
				
				<div class="detail-row">
					<span class="label">📍 Room:</span> ${booking.room_name}
				</div>
				<div class="detail-row">
					<span class="label">🕐 Was scheduled:</span> ${startTime}
				</div>
				<div class="detail-row">
					<span class="label">👤 Cancelled by:</span> ${ownerName}
				</div>
			</div>
			
			<p>If you have any questions, please contact ${ownerName}.</p>
		</div>
		<div class="footer">
			<p>This is an automated message from the Conference Room Booking System.</p>
		</div>
	</div>
</body>
</html>
	`;

	const text = `
Booking Cancelled

Hi ${userName},

⚠️ This booking has been cancelled.

The following booking that you accepted has been cancelled by ${ownerName}.

Booking: ${booking.title}
${booking.description ? `Description: ${booking.description}\n` : ''}
Room: ${booking.room_name}
Was scheduled: ${startTime}
Cancelled by: ${ownerName}

If you have any questions, please contact ${ownerName}.
	`;

	await sendEmail({
		to: userEmail,
		subject,
		html,
		text,
	});
}
