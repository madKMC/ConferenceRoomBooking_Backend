# Email Notification System - Implementation Guide

## Overview

The Conference Room Booking API now includes a complete email notification system using **Nodemailer** with SMTP. This document describes the implementation, configuration, and usage.

## Architecture

### File Structure

```
src/
├── lib/
│   └── mailer.ts                          # Core email sending utility (SMTP transport)
├── services/
│   └── notifications/
│       └── bookingNotification.ts         # Booking-related email templates
└── routes/
    └── testEmail.routes.ts                # Admin email testing endpoints
```

### Integration Points

Email notifications are automatically triggered from:

1. **`invitations.service.ts`**

   - `addInvitees()` → Sends invitation emails to all invited users
   - `respondToInvitation()` → Sends acceptance notification to booking owner

2. **`bookings.service.ts`**
   - `cancelBooking()` → Sends cancellation emails to all accepted invitees

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# SMTP Email Configuration (cPanel hosting)
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587                              # 587 for TLS, 465 for SSL
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-smtp-password
SMTP_FROM=Conference Room Booking <noreply@yourdomain.com>

# Frontend URL (used in email links)
FRONTEND_URL=http://localhost:4200
```

### SMTP Configuration Tips

**cPanel Hosting:**

- Host: Usually `mail.yourdomain.com`
- Port: `587` (TLS) or `465` (SSL)
- User: Your email address (e.g., `noreply@yourdomain.com`)
- Password: Email account password from cPanel

**Common Providers:**

- **Gmail**: `smtp.gmail.com:587` (requires App Password if 2FA enabled)
- **Outlook**: `smtp-mail.outlook.com:587`
- **SendGrid**: `smtp.sendgrid.net:587`
- **AWS SES**: `email-smtp.region.amazonaws.com:587`

## Email Templates

### 1. Booking Invitation Email

**Function:** `sendBookingInvitationEmail()`

**Triggered when:** User is invited to a booking

**Data required:**

```typescript
{
  userName: string,        // Invitee's full name
  userEmail: string,       // Invitee's email
  booking: BookingWithRoom, // Full booking details (includes room info)
  ownerName: string        // Organizer's full name
}
```

**Email contains:**

- Booking title and description
- Room name and capacity
- Date/time (formatted for South African timezone)
- Organizer name
- Link to view/respond to invitation

**Template features:**

- Professional HTML design with green header
- Responsive layout
- Plain-text fallback
- Call-to-action button

### 2. Invitation Accepted Email

**Function:** `sendBookingAcceptedEmail()`

**Triggered when:** Invitee accepts a booking

**Recipients:** Booking owner (organizer)

**Data required:**

```typescript
{
  userName: string,        // Invitee's name (who accepted)
  userEmail: string,       // OWNER's email (recipient)
  booking: BookingWithRoom,
  ownerName: string        // Owner's name
}
```

**Email contains:**

- Confirmation that user accepted
- Booking title
- Room and time details
- Accepted invitee's name

**Template features:**

- Blue header theme
- Clear confirmation message
- Booking summary

### 3. Booking Cancelled Email

**Function:** `sendBookingCancelledEmail()`

**Triggered when:** Booking owner cancels a booking

**Recipients:** All invitees who had accepted

**Data required:**

```typescript
{
  userName: string,        // Invitee's name (recipient)
  userEmail: string,       // Invitee's email
  booking: BookingWithRoom,
  ownerName: string        // Who cancelled it
}
```

**Email contains:**

- Cancellation warning notice
- Original booking details
- Who cancelled it
- Scheduled time (now cancelled)

**Template features:**

- Red/warning header theme
- Yellow warning box
- Clear cancellation message

## API Usage

### Email Testing Endpoints

**Admin-only** endpoints for testing SMTP configuration:

#### 1. Verify SMTP Connection

```http
GET /api/test-email/verify
Authorization: Bearer <admin_jwt_token>
```

**Response:**

```json
{
	"success": true,
	"message": "SMTP connection verified successfully"
}
```

#### 2. Send Test Email

```http
POST /api/test-email/send
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "to": "test@example.com",
  "subject": "Test Email",
  "message": "This is a test message to verify email functionality."
}
```

**Response:**

```json
{
	"success": true,
	"message": "Test email sent successfully to test@example.com"
}
```

## Code Integration Examples

### Sending Invitation Emails

```typescript
// In invitations.service.ts - addInvitees() method

// After adding invitees to database
const owner = await this.usersRepo.findById(requestingUserId);
if (owner) {
	for (const userId of validUserIds) {
		const invitee = await this.usersRepo.findById(userId);
		if (invitee) {
			// Send email asynchronously (doesn't block API response)
			sendBookingInvitationEmail({
				userName: `${invitee.first_name} ${invitee.last_name}`,
				userEmail: invitee.email,
				booking,
				ownerName: `${owner.first_name} ${owner.last_name}`,
			}).catch((error) => {
				logger.error('Failed to send invitation email', {
					bookingId,
					userId,
					error,
				});
			});
		}
	}
}
```

### Sending Acceptance Notifications

```typescript
// In invitations.service.ts - respondToInvitation() method

if (status === 'accepted') {
	const invitee = await this.usersRepo.findById(userId);
	const owner = await this.usersRepo.findById(booking.user_id);

	if (invitee && owner) {
		sendBookingAcceptedEmail({
			userName: `${invitee.first_name} ${invitee.last_name}`,
			userEmail: owner.email, // Send to owner
			booking,
			ownerName: `${owner.first_name} ${owner.last_name}`,
		}).catch((error) => {
			logger.error('Failed to send acceptance notification', { error });
		});
	}
}
```

### Sending Cancellation Emails

```typescript
// In bookings.service.ts - cancelBooking() method

// Get accepted invitees BEFORE cancelling
const invitees = await this.invitationsRepo.getInviteesByBooking(bookingId);
const acceptedInvitees = invitees.filter((inv) => inv.status === 'accepted');

// After cancellation
if (acceptedInvitees.length > 0) {
	const owner = await this.usersRepo.findById(booking.user_id);
	if (owner) {
		for (const invitee of acceptedInvitees) {
			sendBookingCancelledEmail({
				userName: `${invitee.first_name} ${invitee.last_name}`,
				userEmail: invitee.email,
				booking,
				ownerName: `${owner.first_name} ${owner.last_name}`,
			}).catch((error) => {
				logger.error('Failed to send cancellation email', { error });
			});
		}
	}
}
```

## Design Decisions

### 1. Async Email Sending

Emails are sent asynchronously using `.catch()` handlers to:

- **Not block API responses** - Users get immediate feedback
- **Graceful failure** - Email errors don't fail the main operation
- **Error logging** - Failed emails logged for monitoring

```typescript
sendEmail({ ... })
  .catch((error) => logger.error('Email failed', { error }));
```

### 2. No Database Queue

This implementation sends emails directly without a queue because:

- **Simple use case** - Low email volume
- **Non-critical** - Emails are notifications, not essential to business logic
- **Acceptable tradeoff** - Missing an email notification is acceptable

**For production at scale**, consider:

- Message queue (Redis + Bull)
- Email service (SendGrid, AWS SES)
- Retry logic with exponential backoff

### 3. HTML + Text Fallback

Every email includes:

- **HTML version** - Rich formatted template
- **Plain text version** - Auto-generated from HTML (strips tags)

Ensures compatibility with text-only email clients.

### 4. Timezone Handling

All timestamps formatted for `Africa/Johannesburg`:

```typescript
new Date(booking.start_time).toLocaleString('en-ZA', {
	dateStyle: 'full',
	timeStyle: 'short',
	timeZone: 'Africa/Johannesburg',
});
// Output: "Monday, 15 January 2024, 14:00"
```

### 5. Email Validation

Contact form uses **Zod schema validation**:

```typescript
export const contactFormSchema = z.object({
	name: z.string().min(1).max(100),
	email: z.string().email(),
	subject: z.string().min(1).max(200),
	message: z.string().min(10).max(2000),
});
```

Applied via `validate()` middleware in routes.

## Error Handling

### SMTP Connection Errors

```typescript
// In mailer.ts
if (!config.host || !config.auth.user || !config.auth.pass) {
	throw new Error(
		'SMTP configuration missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env'
	);
}
```

### Email Send Failures

All email functions log errors but don't throw:

```typescript
try {
	await transporter.sendMail(mailOptions);
	logger.info('Email sent successfully', { to, subject });
} catch (error) {
	logger.error('Failed to send email', { error, to, subject });
	throw error; // Re-thrown for .catch() handlers
}
```

### Missing Configuration

Application will start even without SMTP config, but emails will fail. Use test endpoint to verify:

```bash
GET /api/test-email/verify
```

## Testing Checklist

### 1. Verify SMTP Connection

```bash
curl -X GET http://localhost:3000/api/test-email/verify \
  -H "Authorization: Bearer <admin_token>"
```

### 2. Send Test Email

```bash
curl -X POST http://localhost:3000/api/test-email/send \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test",
    "message": "Testing SMTP configuration"
  }'
```

### 3. Test Booking Invitation Flow

1. Create a booking as User A
2. Invite User B to the booking
3. Check User B's email for invitation
4. User B accepts invitation
5. Check User A's email for acceptance notification
6. User A cancels booking
7. Check User B's email for cancellation notice

## Troubleshooting

### Email Not Sending

1. **Check SMTP credentials**:

   ```bash
   GET /api/test-email/verify
   ```

2. **Check logs**:

   ```bash
   tail -f logs/app.log | grep -i email
   tail -f logs/error.log
   ```

3. **Common issues**:
   - Wrong SMTP port (587 vs 465)
   - Firewall blocking SMTP
   - Invalid credentials
   - 2FA requiring app password (Gmail)
   - cPanel security restrictions

### Emails Going to Spam

- Use proper `SMTP_FROM` header with your domain
- Ensure SPF/DKIM records configured on domain
- Use SSL/TLS (port 465 or 587)
- Avoid spam trigger words in subject/body

### Missing Environment Variables

Error: `SMTP configuration missing`

**Solution**: Ensure all required variables in `.env`:

```env
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
```

## Security Considerations

1. **No credentials in code** - All SMTP config from environment variables
2. **Admin-only test endpoints** - Require `admin` role
3. **Input validation** - Zod schema prevents injection attacks
4. **Async error handling** - Email failures don't expose internal errors to users

## Future Enhancements

- [ ] Email templates using Handlebars or EJS
- [ ] Queue system for high-volume email sending (Bull + Redis)
- [ ] Email delivery tracking and analytics
- [ ] Unsubscribe functionality for notification emails
- [ ] Rich text editor for admin to customize templates
- [ ] Email preview endpoint before sending
- [ ] Localization support for multiple languages
- [ ] Attachment support for bookings (agenda, etc.)

## Summary

The email notification system is now fully integrated with:

- ✅ Booking invitations sent to invitees
- ✅ Acceptance notifications to booking owners
- ✅ Cancellation emails to accepted invitees
- ✅ Admin testing endpoints
- ✅ Professional HTML templates
- ✅ Error logging and graceful failure handling
- ✅ Environment-based configuration
- ✅ Full documentation in README

All emails are sent asynchronously, don't block API responses, and are fully logged for monitoring.
