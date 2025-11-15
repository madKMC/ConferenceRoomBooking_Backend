# Conference Room Booking API

A production-grade RESTful API for managing conference room bookings in a co-working space. Built with Node.js, Express, TypeScript, and MySQL with JWT-based authentication and role-based authorization.

## Features

- **Authentication & Authorization**: JWT-based auth with admin/user role-based access control
- **Room Management**: View available rooms with amenities
- **Availability Checking**: Check real-time room availability with 30-minute slot granularity
- **Booking System**: Create, update, and cancel bookings with concurrency control
- **Booking Invitations**: Collaborative bookings - invite other users to your bookings
- **Business Rules Enforcement**:
  - Business hours: 9 AM - 5 PM
  - Booking duration: 30 minutes - 4 hours
  - Automatic double-booking prevention
- **Clean Architecture**: Routes → Controllers → Services → Repositories
- **Transaction Safety**: ACID-compliant operations with automatic rollback on errors
  - All booking operations (create, update, cancel) wrapped in transactions
  - All invitation operations (add, remove, respond) wrapped in transactions
  - Atomic multi-step operations prevent partial failures
- **Validation**: Comprehensive request validation with Zod (supports flexible datetime formats)
- **Error Handling**: Standardized error responses with correlation IDs
- **Logging**: File-based logging with automatic rotation (`logs/app.log`, `logs/error.log`)
- **Security**: bcrypt password hashing, JWT tokens, role-based middleware
- **CORS**: Enabled for frontend integration (configurable origins)

## Architecture

### Layered Structure

```
routes → controllers → services → repositories
```

- **Routes**: Express route definitions with validation middleware
- **Controllers**: HTTP request/response handling
- **Services**: Business logic, validation, and transaction coordination
- **Repositories**: Database queries and data mapping

### Concurrency Control

The API prevents race conditions and double-bookings using MySQL's InnoDB transaction isolation features:

#### REPEATABLE READ + Next-Key Locks

MySQL InnoDB uses **REPEATABLE READ** isolation level by default. Combined with **next-key locks** acquired during `SELECT ... FOR UPDATE`, this eliminates race conditions:

1. **Transaction begins** - Establishes a consistent snapshot
2. **SELECT ... FOR UPDATE** - Acquires exclusive locks on:
   - Existing rows matching the query (record locks)
   - Gaps between index entries (gap locks)
   - Combined: **next-key locks** prevent phantom reads
3. **Overlap check** - If any conflicting bookings exist → 409 Conflict
4. **Insert booking** - Only if no conflicts detected
5. **Commit** - Releases all locks atomically

#### Why This Works

```sql
-- Service layer executes within a transaction:
BEGIN;

-- Acquire next-key locks on the (room_id, start_time, end_time) index
-- This locks both existing overlapping rows AND the gap where new booking would be inserted
SELECT id FROM bookings
WHERE room_id = ?
  AND start_time < ?  -- end_time of new booking
  AND end_time > ?    -- start_time of new booking
FOR UPDATE;

-- If count > 0: throw 409 Conflict
-- Otherwise: safe to insert
INSERT INTO bookings (...) VALUES (...);

COMMIT;  -- Releases locks
```

**Key Properties:**

- Other transactions trying to book the same time window will **block** on the SELECT FOR UPDATE
- Gap locks prevent **phantom reads** (new rows appearing in the range)
- Locks held until COMMIT ensure **serializable** booking creation
- Index on `(room_id, start_time, end_time)` makes locking efficient

## Prerequisites

- Node.js 18+
- MySQL 8+
- npm or yarn

## Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd ConferenceRoomBooking_Backend
npm install
```

### 2. Database Setup

Create the database and tables:

```bash
# Login to MySQL
mysql -u root -p

# Run the schema file
source setup_database.sql
```

Or using command line:

```bash
mysql -u root -p < setup_database.sql
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=conference_booking
DB_CONNECTION_LIMIT=10

TZ=Africa/Johannesburg

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# SMTP Email Configuration
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-smtp-password
SMTP_FROM=Conference Room Booking <noreply@yourdomain.com>

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:4200
```

**Important**:

- Change `JWT_SECRET` to a secure random string in production
- Configure SMTP settings with your cPanel hosting credentials (typically port 587 for TLS or 465 for SSL)

### 4. Run the Application

**Development mode** (with auto-reload):

```bash
npm run dev
```

**Production build**:

```bash
npm run build
npm start
```

The API will be available at `http://localhost:3000`

## CORS Configuration

The API is configured with CORS to allow frontend applications to make requests:

- **Allowed Origins**: `http://localhost:5173` (Vite default), `http://localhost:3000`
- **Credentials**: Enabled (allows cookies and Authorization headers)
- **Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization

To modify allowed origins for production, edit `src/app.ts`:

```typescript
app.use(
	cors({
		origin: ['http://localhost:5173', 'https://your-production-domain.com'],
		credentials: true,
	})
);
```

## Authentication

The API uses **JWT (JSON Web Tokens)** for authentication with role-based authorization.

### User Roles

- **`user`** - Regular users can only view and manage their own bookings
- **`admin`** - Administrators can view and manage all bookings

### Authentication Flow

1. **Register** a new account or **login** with existing credentials
2. Receive a JWT token in the response
3. Include the token in the `Authorization` header for all protected endpoints:
   ```
   Authorization: Bearer <your-jwt-token>
   ```

### Auth Endpoints

#### Register a New User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1-555-0200"
}
```

**Response:**

```json
{
	"success": true,
	"data": {
		"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
		"user": {
			"id": 7,
			"email": "user@example.com",
			"first_name": "John",
			"last_name": "Doe",
			"role": "user"
		}
	}
}
```

#### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
	"success": true,
	"data": {
		"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
		"user": {
			"id": 2,
			"email": "john.doe@example.com",
			"first_name": "John",
			"last_name": "Doe",
			"role": "user"
		}
	}
}
```

#### Get Current User

```bash
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**

```json
{
	"success": true,
	"data": {
		"id": 2,
		"email": "john.doe@example.com",
		"first_name": "John",
		"last_name": "Doe",
		"role": "user"
	}
}
```

### Default Admin Account

The database is seeded with an admin account:

- **Email**: `admin@example.com`
- **Password**: `admin123`

**⚠️ IMPORTANT**: Change this password in production!

### Role-Based Access Control

| Endpoint                         | User Access                    | Admin Access           |
| -------------------------------- | ------------------------------ | ---------------------- |
| `POST /auth/register`            | ✅ Public                      | ✅ Public              |
| `POST /auth/login`               | ✅ Public                      | ✅ Public              |
| `GET /auth/me`                   | ✅ Own profile                 | ✅ Own profile         |
| `GET /rooms`                     | ✅ All rooms                   | ✅ All rooms           |
| `GET /rooms/:id`                 | ✅ Any room                    | ✅ Any room            |
| `GET /rooms/:id/bookings`        | ✅ Any room's bookings         | ✅ Any room's bookings |
| `GET /rooms/:id/availability`    | ✅ Any room                    | ✅ Any room            |
| `POST /rooms`                    | ❌ Forbidden                   | ✅ Create rooms        |
| `PATCH /rooms/:id`               | ❌ Forbidden                   | ✅ Update rooms        |
| `DELETE /rooms/:id`              | ❌ Forbidden                   | ✅ Delete rooms        |
| `GET /rooms/:id/availability`    | ✅ Any room                    | ✅ Any room            |
| `GET /bookings`                  | ❌ Forbidden                   | ✅ All bookings        |
| `POST /bookings`                 | ✅ Own bookings                | ✅ Any booking         |
| `GET /bookings/:id`              | ✅ Own bookings or invited     | ✅ Any booking         |
| `PATCH /bookings/:id`            | ✅ Own bookings only           | ✅ Any booking         |
| `DELETE /bookings/:id`           | ✅ Own bookings only           | ✅ Any booking         |
| `POST /bookings/:id/invitees`    | ✅ Own bookings only (owner)   | ✅ Any booking         |
| `GET /bookings/:id/invitees`     | ✅ If owner or invited         | ✅ Any booking         |
| `DELETE /bookings/:id/invitees/` | ✅ Own bookings only (owner)   | ✅ Any booking         |
| `PATCH /bookings/:id/invitation` | ✅ If invited                  | ✅ Any booking         |
| `GET /users`                     | ✅ All users (for invitations) | ✅ All users           |
| `GET /users/:id/bookings`        | ✅ Own bookings only           | ✅ Any user's bookings |

## Logging

The application uses file-based logging with automatic rotation:

- **`logs/app.log`** - All application logs (info, warn, error, debug)
- **`logs/error.log`** - Error logs only
- **Automatic rotation** - When log files exceed 10MB, they are archived with timestamps
- **Console output** - Logs are also displayed in the console for development

Log files are automatically created when the server starts and are excluded from git via `.gitignore`.

## Email Notifications

The API sends automated email notifications for key booking events using **Nodemailer** with SMTP.

### Configuration

Email functionality requires SMTP configuration in `.env`:

```env
SMTP_HOST=mail.yourdomain.com    # Your cPanel mail server
SMTP_PORT=587                    # 587 for TLS, 465 for SSL
SMTP_USER=noreply@yourdomain.com # SMTP authentication user
SMTP_PASS=your-smtp-password     # SMTP password
SMTP_FROM=Conference Room Booking <noreply@yourdomain.com>
ADMIN_EMAIL=admin@yourdomain.com # For contact form submissions
FRONTEND_URL=http://localhost:4200  # Frontend URL for email links
```

### Notification Types

**1. Booking Invitation Email**

- **Trigger**: When a user is invited to a booking
- **Recipients**: All newly invited users
- **Contains**: Booking title, description, room details, date/time, organizer name
- **Action**: Provides link to view and respond to invitation

**2. Invitation Accepted Email**

- **Trigger**: When an invitee accepts a booking invitation
- **Recipients**: Booking owner
- **Contains**: Invitee name, booking details, confirmation message
- **Purpose**: Notify organizer of confirmed attendance

**3. Booking Cancelled Email**

- **Trigger**: When a booking is cancelled by the owner
- **Recipients**: All invitees who had accepted the invitation
- **Contains**: Cancellation notice, original booking details, organizer name
- **Purpose**: Inform attendees of cancellation

### Email Features

- **HTML Templates**: Professionally styled responsive email templates
- **Fallback Text**: Plain-text version automatically generated from HTML
- **Async Processing**: Email sending doesn't block API responses
- **Error Logging**: Failed emails logged but don't fail the main operation
- **South African Time**: All timestamps formatted for `Africa/Johannesburg` timezone

### Testing Email

Admin-only endpoints for testing email configuration:

```
GET  /api/test-email/verify  # Verify SMTP connection
POST /api/test-email/send    # Send a test email
```

**Example test email request:**

```json
POST /api/test-email/send
Authorization: Bearer <admin_jwt_token>

{
  "to": "test@example.com",
  "subject": "Test Subject",
  "message": "Test message content"
}
```

## API Endpoints

All endpoints except `/auth/register` and `/auth/login` require authentication via JWT token.

### Health Check

```
GET /api/health  (No auth required)
```

### Authentication

```
POST /api/auth/register  (No auth required)
POST /api/auth/login     (No auth required)
GET  /api/auth/me        (Requires auth)
```

### Rooms

```
GET    /api/rooms                              (Requires auth)
GET    /api/rooms?capacity=10&floor=3          (Requires auth, with filters)
POST   /api/rooms                              (Admin only)
GET    /api/rooms/:id                          (Requires auth)
GET    /api/rooms/:id/bookings?date=YYYY-MM-DD (Requires auth)
GET    /api/rooms/:id/availability?date=YYYY-MM-DD  (Requires auth)
PATCH  /api/rooms/:id                          (Admin only)
DELETE /api/rooms/:id                          (Admin only, soft delete)
```

### Bookings

```
GET    /api/bookings                        (Admin only)
GET    /api/bookings?status=confirmed&room_id=1&date=2025-11-15  (Admin only, with filters)
POST   /api/bookings                        (Requires auth)
GET    /api/bookings/:id                    (Requires auth, owner, invitee, or admin)
PATCH  /api/bookings/:id                    (Requires auth, own booking or admin)
DELETE /api/bookings/:id                    (Requires auth, own booking or admin)
POST   /api/bookings/:id/invitees           (Requires auth, own booking or admin)
GET    /api/bookings/:id/invitees           (Requires auth, owner, invitee, or admin)
DELETE /api/bookings/:bookingId/invitees/:userId  (Requires auth, own booking or admin)
PATCH  /api/bookings/:id/invitation         (Requires auth, invitee only)
```

### Users

```
GET /api/users                              (Requires auth)
GET /api/users?search=john&limit=10&offset=0  (Requires auth, with filters)
GET /api/users/:id/bookings                 (Requires auth, own bookings or admin)
GET /api/users/:id/bookings?status=confirmed&limit=10&offset=0  (Requires auth, own bookings or admin)
```

### Analytics (Admin Only)

```
GET /api/analytics/utilization?start=YYYY-MM-DD&end=YYYY-MM-DD  (Admin only)
GET /api/analytics/bookings/daily?start=YYYY-MM-DD&end=YYYY-MM-DD  (Admin only)
GET /api/analytics/users/:id/summary  (Admin only)
GET /api/analytics/users/:id/summary?start=YYYY-MM-DD&end=YYYY-MM-DD  (Admin only)
```

## Analytics

**Admin-only** read-only analytics endpoints for insights into room utilization, booking trends, and user activity.

### Room Utilization Dashboard

Get room utilization statistics over a date range.

```bash
GET /api/analytics/utilization?start=2025-11-01&end=2025-11-15
Authorization: Bearer <admin_token>
```

**Query Parameters:**

- `start` (required): Start date in YYYY-MM-DD format
- `end` (required): End date in YYYY-MM-DD format

**Response:**

```json
{
	"success": true,
	"data": [
		{
			"room_id": 1,
			"room_name": "Boardroom A",
			"total_booked_hours": 18.5,
			"total_available_hours": 120,
			"utilization_percentage": 15.42
		},
		{
			"room_id": 2,
			"room_name": "Meeting Room 1",
			"total_booked_hours": 32.0,
			"total_available_hours": 120,
			"utilization_percentage": 26.67
		}
	]
}
```

**Calculation:**

- Considers only business hours (09:00-17:00) = 8 hours per day
- `total_available_hours` = 8 hours × number of days in range
- Only counts bookings with status `confirmed` or `completed`
- Utilization percentage rounded to 2 decimal places

### Daily Booking Trends

Get daily booking statistics over a date range.

```bash
GET /api/analytics/bookings/daily?start=2025-11-01&end=2025-11-15
Authorization: Bearer <admin_token>
```

**Query Parameters:**

- `start` (required): Start date in YYYY-MM-DD format
- `end` (required): End date in YYYY-MM-DD format

**Response:**

```json
{
	"success": true,
	"data": [
		{
			"date": "2025-11-01",
			"total_bookings": 7,
			"total_booked_hours": 19
		},
		{
			"date": "2025-11-02",
			"total_bookings": 5,
			"total_booked_hours": 14
		}
	]
}
```

**Details:**

- Groups bookings by date based on `start_time`
- Only includes bookings with status `confirmed` or `completed`
- Ordered by date ascending
- Days with no bookings are not included in response

### User Booking History Summary

Get comprehensive booking statistics for a specific user.

```bash
# All-time summary
GET /api/analytics/users/1/summary
Authorization: Bearer <admin_token>

# Summary for date range
GET /api/analytics/users/1/summary?start=2025-11-01&end=2025-11-15
Authorization: Bearer <admin_token>
```

**Query Parameters:**

- `start` (optional): Start date in YYYY-MM-DD format
- `end` (optional): End date in YYYY-MM-DD format
- Note: Both `start` and `end` must be provided together, or both omitted

**Response:**

```json
{
	"success": true,
	"data": {
		"user_id": 1,
		"total_bookings": 15,
		"total_canceled_bookings": 3,
		"total_booked_hours": 32,
		"first_booking_date": "2025-01-10",
		"last_booking_date": "2025-11-05",
		"rooms_used": [
			{
				"room_id": 1,
				"room_name": "Boardroom A",
				"count": 7
			},
			{
				"room_id": 3,
				"room_name": "Huddle Room 2",
				"count": 5
			}
		]
	}
}
```

**Details:**

- `total_canceled_bookings`: Count of bookings with status `cancelled`
- `total_booked_hours`: Sum of hours for non-cancelled bookings only
- `rooms_used`: Array of rooms used by user, ordered by count descending
- Returns 404 if user does not exist
- Returns zero counts and empty arrays if user has no bookings

**Error Responses:**

- `400 BAD_REQUEST` - Invalid date format or start > end
- `401 UNAUTHORIZED` - Not authenticated
- `403 FORBIDDEN` - Not an admin user
- `404 NOT_FOUND` - User not found (for user summary endpoint)

## Booking Invitations

Users can invite other users to their bookings. Invited users can view the booking details but only the owner can modify or cancel the booking.

### Invitation Workflow

1. **Booking owner** invites users via `POST /bookings/:id/invitees`
2. **Invitees** receive invitations with `pending` status
3. **Invitees** can accept/decline via `PATCH /bookings/:id/invitation`
4. **All invitees** can view the booking and see who else is invited
5. **Only owner** can add or remove invitees
6. **Invitees** see bookings they're invited to in their user bookings list

### Database Schema

The `booking_invitations` table tracks invitation status:

```sql
CREATE TABLE booking_invitations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  UNIQUE KEY unique_booking_user (booking_id, user_id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Invitation Endpoints

#### List Users (for inviting)

Get a list of all users to select invitees. Supports search and pagination.

```bash
GET /api/users
GET /api/users?search=john
GET /api/users?search=john&limit=10&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**

- `search` (optional) - Search by email, first name, or last name
- `limit` (optional) - Number of results to return (default: 50)
- `offset` (optional) - Number of results to skip (default: 0)

**Response:**

```json
{
	"success": true,
	"data": [
		{
			"id": 2,
			"email": "john.doe@example.com",
			"first_name": "John",
			"last_name": "Doe",
			"phone": "+1-555-0100",
			"role": "user",
			"created_at": "2024-01-01T08:00:00.000Z",
			"updated_at": "2024-01-01T08:00:00.000Z"
		}
	]
}
```

#### Add Invitees to Booking

Invite users to a booking. Only the booking owner can add invitees.

```bash
POST /api/bookings/:id/invitees
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_ids": [2, 3, 4]
}
```

**Request Body:**

- `user_ids` (array of numbers) - User IDs to invite (min: 1, max: 20)

**Response:**

```json
{
	"success": true,
	"data": [
		{
			"id": 1,
			"booking_id": 5,
			"user_id": 2,
			"status": "pending",
			"invited_at": "2025-11-13T10:00:00.000Z",
			"responded_at": null,
			"email": "john.doe@example.com",
			"first_name": "John",
			"last_name": "Doe"
		},
		{
			"id": 2,
			"booking_id": 5,
			"user_id": 3,
			"status": "pending",
			"invited_at": "2025-11-13T10:00:00.000Z",
			"responded_at": null,
			"email": "jane.smith@example.com",
			"first_name": "Jane",
			"last_name": "Smith"
		}
	]
}
```

**Error Responses:**

- `404 NOT_FOUND` - Booking not found
- `403 FORBIDDEN` - Only the booking owner can invite users
- `400 BAD_REQUEST` - No valid users to invite

#### Get Invitees for a Booking

View all users invited to a booking. Accessible by owner, invitees, or admin.

```bash
GET /api/bookings/:id/invitees
Authorization: Bearer <token>
```

**Response:**

```json
{
	"success": true,
	"data": [
		{
			"id": 1,
			"booking_id": 5,
			"user_id": 2,
			"status": "accepted",
			"invited_at": "2025-11-13T10:00:00.000Z",
			"responded_at": "2025-11-13T10:15:00.000Z",
			"email": "john.doe@example.com",
			"first_name": "John",
			"last_name": "Doe",
			"start_time": "2025-11-15T14:00:00.000Z",
			"display_status": "accepted"
		},
		{
			"id": 2,
			"booking_id": 5,
			"user_id": 3,
			"status": "pending",
			"invited_at": "2025-11-13T10:00:00.000Z",
			"responded_at": null,
			"email": "jane.smith@example.com",
			"first_name": "Jane",
			"last_name": "Smith",
			"start_time": "2025-11-15T14:00:00.000Z",
			"display_status": "pending"
		},
		{
			"id": 3,
			"booking_id": 5,
			"user_id": 4,
			"status": "pending",
			"invited_at": "2025-11-10T09:00:00.000Z",
			"responded_at": null,
			"email": "bob.jones@example.com",
			"first_name": "Bob",
			"last_name": "Jones",
			"start_time": "2025-11-12T10:00:00.000Z",
			"display_status": "expired"
		}
	]
}
```

**Response Fields:**

- `status` - The actual database status: `"pending"`, `"accepted"`, or `"declined"`
- `display_status` - Computed UI status. Returns `"expired"` when `status` is `"pending"` and `start_time` has passed
- `start_time` - The booking start time (for client-side expiration checks)

**Error Responses:**

- `404 NOT_FOUND` - Booking not found
- `403 FORBIDDEN` - Access denied (not owner, invitee, or admin)

#### Remove Invitee from Booking

Remove a user from a booking's invitee list. Only the booking owner can remove invitees.

```bash
DELETE /api/bookings/:bookingId/invitees/:userId
Authorization: Bearer <token>
```

**Response:**

```json
{
	"success": true,
	"data": {
		"message": "Invitee removed successfully"
	}
}
```

**Error Responses:**

- `404 NOT_FOUND` - Booking not found or invitation not found
- `403 FORBIDDEN` - Only the booking owner can remove invitees

#### Respond to Invitation

Accept or decline a booking invitation. Only the invitee can respond.

```bash
PATCH /api/bookings/:id/invitation
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "accepted"
}
```

**Request Body:**

- `status` (string) - Must be either `"accepted"` or `"declined"`

**Response:**

```json
{
	"success": true,
	"data": {
		"message": "Invitation accepted successfully"
	}
}
```

**Error Responses:**

- `404 NOT_FOUND` - Invitation not found
- `400 BAD_REQUEST` - Cannot respond to invitation - booking has already started or passed
- `422 VALIDATION_ERROR` - Invalid status value

### Invitation Access Control

| Action                | Owner  | Invitee               | Admin                 |
| --------------------- | ------ | --------------------- | --------------------- |
| Add invitees          | ✅ Yes | ❌ No                 | ✅ Yes                |
| Remove invitees       | ✅ Yes | ❌ No                 | ✅ Yes                |
| View invitees         | ✅ Yes | ✅ Yes                | ✅ Yes                |
| Respond to invitation | ❌ No  | ✅ Yes (before start) | ✅ Yes (before start) |
| View invited booking  | ✅ Yes | ✅ Yes                | ✅ Yes                |
| Edit/delete booking   | ✅ Yes | ❌ No                 | ✅ Yes                |

**Key Points:**

- **Owners** have full control over their booking and can manage invitees
- **Invitees** can view the booking, see other invitees, and accept/decline their invitation
- **Invitees** appear in `GET /users/:id/bookings` with a `role` field set to `"invitee"`
- **Admins** can perform all operations on any booking
- Duplicate invitations are handled automatically (re-invitation resets status to pending)
- Invitations are automatically deleted when a booking is deleted (CASCADE)
- **Invitation Expiration**: Users cannot accept/decline invitations after the booking start time has passed. Expired pending invitations show `display_status: "expired"` in API responses.
- **Transaction Safety**: All invitation operations (add, remove, respond) are wrapped in database transactions to ensure atomicity and prevent partial failures

## Room Management (CRUD)

### List All Rooms

Get all rooms with optional filters.

```bash
GET /api/rooms
GET /api/rooms?capacity=10
GET /api/rooms?floor=3&limit=5
Authorization: Bearer <token>
```

**Query Parameters:**

- `capacity` (optional) - Minimum capacity
- `floor` (optional) - Specific floor number
- `limit` (optional) - Number of results
- `offset` (optional) - Skip number of results

### Get Room by ID

```bash
GET /api/rooms/:id
Authorization: Bearer <token>
```

### Get Room Bookings

View all bookings for a specific room on a given date. Accessible to all authenticated users.

```bash
GET /api/rooms/:id/bookings?date=2025-11-15
Authorization: Bearer <token>
```

**Query Parameters:**

- `date` (required) - Date to check bookings for (format: YYYY-MM-DD)

**Response:**

```json
{
	"success": true,
	"data": [
		{
			"id": 12,
			"title": "Team Meeting",
			"start_time": "2025-11-15T10:00:00.000Z",
			"end_time": "2025-11-15T11:00:00.000Z",
			"status": "confirmed"
		},
		{
			"id": 15,
			"title": "Client Presentation",
			"start_time": "2025-11-15T14:00:00.000Z",
			"end_time": "2025-11-15T15:30:00.000Z",
			"status": "confirmed"
		}
	]
}
```

**Note:** Only returns bookings with status `confirmed` or `pending`. Cancelled and completed bookings are excluded.

### Create Room (Admin Only)

```bash
POST /api/rooms
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Innovation Hub",
  "capacity": 15,
  "floor": 4,
  "description": "Modern meeting space with smart technology",
  "is_active": true
}
```

**Response:**

```json
{
	"success": true,
	"data": {
		"id": 8,
		"name": "Innovation Hub",
		"capacity": 15,
		"floor": 4,
		"description": "Modern meeting space with smart technology",
		"is_active": true,
		"created_at": "2025-11-15T10:00:00.000Z",
		"updated_at": "2025-11-15T10:00:00.000Z"
	}
}
```

### Update Room (Admin Only)

```bash
PATCH /api/rooms/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "capacity": 20,
  "description": "Updated description"
}
```

### Delete Room (Admin Only)

Soft delete - sets `is_active` to `false`.

```bash
DELETE /api/rooms/:id
Authorization: Bearer <admin-token>
```

**Response:**

```json
{
	"success": true,
	"data": {
		"message": "Room deleted successfully"
	}
}
```

## Booking Filters

The `/api/bookings` endpoint now supports date filtering:

```bash
# Get all bookings on a specific date
GET /api/bookings?date=2025-11-15
Authorization: Bearer <admin-token>

# Combine with other filters
GET /api/bookings?date=2025-11-15&status=confirmed&room_id=1
Authorization: Bearer <admin-token>
```

**Query Parameters:**

- `status` (optional) - Filter by status (confirmed, pending, cancelled, completed)
- `room_id` (optional) - Filter by room ID
- `user_id` (optional) - Filter by user ID
- `date` (optional) - Filter by date (format: YYYY-MM-DD)
- `limit` (optional) - Number of results
- `offset` (optional) - Skip number of results

## Booking Response Structure

All booking endpoints (`GET /api/bookings/:id`, `GET /api/users/:id/bookings`, `GET /api/bookings`) now include room information in their responses for easier display in invitations and booking lists.

**Booking Object Structure:**

```json
{
	"id": 7,
	"room_id": 2,
	"user_id": 5,
	"title": "Team Sync",
	"description": "Weekly team meeting",
	"start_time": "2025-11-20T10:00:00.000Z",
	"end_time": "2025-11-20T11:00:00.000Z",
	"status": "confirmed",
	"created_at": "2025-11-15T10:00:00.000Z",
	"updated_at": "2025-11-15T10:00:00.000Z",
	"room_name": "Conference Room A",
	"room_capacity": 12
}
```

**Room Fields:**

- `room_name` - Name of the booked room (for easy display without additional API calls)
- `room_capacity` - Capacity of the booked room

**Note:** The `/api/users/:id/bookings` endpoint also includes a `role` field (`"owner"` or `"invitee"`) to distinguish between bookings owned by the user and bookings they're invited to.

## Example Requests

### Login and Get Token

```bash
# Login as a regular user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'

# Response includes token
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

### Create a Booking (with authentication)

The API accepts flexible datetime formats:

- ✅ `"2025-11-15T10:00:00"` (without timezone)
- ✅ `"2025-11-15T10:00:00Z"` (UTC)
- ✅ `"2025-11-15T10:00:00.000Z"` (with milliseconds)
- ✅ `"2025-11-15T10:00:00+02:00"` (with timezone offset)

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token-here>" \
  -d '{
    "room_id": 1,
    "user_id": 1,
    "title": "Team Meeting",
    "description": "Weekly sync",
    "start_time": "2025-11-15T10:00:00",
    "end_time": "2025-11-15T11:00:00"
  }'
```

### Check Room Availability (with authentication)

```bash
curl http://localhost:3000/api/rooms/1/availability?date=2025-11-15 \
  -H "Authorization: Bearer <your-token-here>"
```

### Get All Bookings (admin only)

```bash
curl http://localhost:3000/api/bookings \
  -H "Authorization: Bearer <admin-token-here>"

# With filters
curl "http://localhost:3000/api/bookings?status=confirmed&room_id=1" \
  -H "Authorization: Bearer <admin-token-here>"
```

### Get User Bookings (own bookings or admin)

```bash
curl http://localhost:3000/api/users/1/bookings \
  -H "Authorization: Bearer <your-token-here>"
```

## Error Response Format

All errors follow a standard format:

```json
{
	"code": "ERROR_CODE",
	"message": "Human-readable error message",
	"details": {},
	"correlationId": "uuid-v4"
}
```

### Common Error Codes

- `400 BAD_REQUEST` - Invalid request parameters
- `401 UNAUTHORIZED` - Missing or invalid authentication token
- `403 FORBIDDEN` - Insufficient permissions (e.g., user trying to access admin endpoint)
- `404 NOT_FOUND` - Resource not found
- `409 CONFLICT` - Booking conflict (double-booking)
- `422 VALIDATION_ERROR` - Request validation failed
- `500 INTERNAL_SERVER_ERROR` - Server error

## Business Rules

### Business Hours

- Bookings only allowed between **09:00 - 17:00**
- Start time must be >= 09:00
- End time must be <= 17:00

### Booking Duration

- **Minimum**: 30 minutes
- **Maximum**: 4 hours (240 minutes)

### Double-Booking Prevention

- Enforced at database level via triggers
- Enforced in service layer via transactions with row locking
- Only `confirmed` and `pending` bookings block time slots
- `cancelled` and `completed` bookings don't prevent new bookings

## Development

### Project Structure

```
src/
├── app.ts                    # Express app configuration
├── server.ts                 # Server entry point
├── config/
│   ├── db.ts                # Database pool and transactions
│   └── env.ts               # Environment variables (incl. JWT config)
├── middlewares/
│   ├── auth.ts              # JWT authentication & authorization
│   ├── correlationId.ts     # Request tracking
│   ├── errorHandler.ts      # Global error handling
│   └── validate.ts          # Zod validation middleware
├── utils/
│   ├── httpErrors.ts        # Custom error classes
│   ├── jwt.ts               # JWT token utilities
│   ├── logger.ts            # File & console logging with rotation
│   └── time.ts              # Time/date utilities
├── types/
│   └── express.d.ts         # TypeScript type extensions (req.user)
├── domain/zod/
│   ├── auth.schema.ts       # Auth validation schemas
│   ├── bookings.schema.ts   # Booking validation schemas
│   ├── rooms.schema.ts      # Room validation schemas
│   └── users.schema.ts      # User validation schemas
├── repositories/
│   ├── auth.repo.ts         # Auth data access
│   ├── bookings.repo.ts     # Booking data access (with transaction support)
│   ├── invitations.repo.ts  # Invitation data access (with transaction support)
│   ├── rooms.repo.ts        # Room data access
│   └── users.repo.ts        # User data access (with transaction support)
├── services/
│   ├── auth.service.ts      # Auth business logic (bcrypt, JWT)
│   ├── bookings.service.ts  # Booking business logic (transactional)
│   ├── invitations.service.ts # Invitation business logic (transactional)
│   ├── rooms.service.ts     # Room business logic
│   ├── users.service.ts     # User business logic
│   └── notifications/
│       └── bookingNotification.ts # Email templates for invitations
├── lib/
│   └── mailer.ts            # SMTP email sending utility
├── controllers/
│   ├── auth.controller.ts   # Auth endpoints
│   ├── bookings.controller.ts
│   ├── rooms.controller.ts
│   └── users.controller.ts
└── routes/
    ├── index.ts             # Main router
    ├── auth.routes.ts       # Auth routes
    ├── bookings.routes.ts
    ├── rooms.routes.ts
    └── users.routes.ts
```

### Scripts

```bash
npm run dev        # Start development server with auto-reload
npm run build      # Compile TypeScript to JavaScript
npm start          # Start production server
npm run lint       # Run ESLint
npm run lint:fix   # Fix linting issues
npm test           # Run tests (placeholder)
```

### Testing with REST Client

Install the "REST Client" VS Code extension and use `requests.http` for manual testing.

## Database Schema

See `setup_database.sql` for the complete schema including:

- **users** - User accounts
- **rooms** - Conference rooms
- **amenities** - Room features (projector, whiteboard, etc.)
- **room_amenities** - Many-to-many room-amenity relationships
- **bookings** - Reservations with conflict prevention

## License

ISC
A booking management system for a co-working space with multiple conference rooms.
