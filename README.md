# Conference Room Booking API

A production-grade RESTful API for managing conference room bookings in a co-working space. Built with Node.js, Express, TypeScript, and MySQL with JWT-based authentication and role-based authorization.

## Features

- **Authentication & Authorization**: JWT-based auth with admin/user role-based access control
- **Room Management**: View available rooms with amenities
- **Availability Checking**: Check real-time room availability with 30-minute slot granularity
- **Booking System**: Create, update, and cancel bookings with concurrency control
- **Business Rules Enforcement**:
  - Business hours: 9 AM - 5 PM
  - Booking duration: 30 minutes - 4 hours
  - Automatic double-booking prevention
- **Clean Architecture**: Routes → Controllers → Services → Repositories
- **Transaction Safety**: ACID-compliant booking operations
- **Validation**: Comprehensive request validation with Zod
- **Error Handling**: Standardized error responses with correlation IDs
- **Logging**: File-based logging with automatic rotation (`logs/app.log`, `logs/error.log`)
- **Security**: bcrypt password hashing, JWT tokens, role-based middleware

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
```

**Important**: Change `JWT_SECRET` to a secure random string in production.

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

| Endpoint                      | User Access          | Admin Access           |
| ----------------------------- | -------------------- | ---------------------- |
| `POST /auth/register`         | ✅ Public            | ✅ Public              |
| `POST /auth/login`            | ✅ Public            | ✅ Public              |
| `GET /auth/me`                | ✅ Own profile       | ✅ Own profile         |
| `GET /rooms`                  | ✅ All rooms         | ✅ All rooms           |
| `GET /rooms/:id/availability` | ✅ Any room          | ✅ Any room            |
| `GET /bookings`               | ❌ Forbidden         | ✅ All bookings        |
| `POST /bookings`              | ✅ Own bookings      | ✅ Any booking         |
| `GET /bookings/:id`           | ✅ Own bookings only | ✅ Any booking         |
| `PATCH /bookings/:id`         | ✅ Own bookings only | ✅ Any booking         |
| `DELETE /bookings/:id`        | ✅ Own bookings only | ✅ Any booking         |
| `GET /users/:id/bookings`     | ✅ Own bookings only | ✅ Any user's bookings |

## Logging

The application uses file-based logging with automatic rotation:

- **`logs/app.log`** - All application logs (info, warn, error, debug)
- **`logs/error.log`** - Error logs only
- **Automatic rotation** - When log files exceed 10MB, they are archived with timestamps
- **Console output** - Logs are also displayed in the console for development

Log files are automatically created when the server starts and are excluded from git via `.gitignore`.

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
GET /api/rooms                              (Requires auth)
GET /api/rooms?capacity=10&floor=3          (Requires auth)
GET /api/rooms/:id/availability?date=YYYY-MM-DD  (Requires auth)
```

### Bookings

```
GET    /api/bookings                        (Admin only)
GET    /api/bookings?status=confirmed&room_id=1  (Admin only, with filters)
POST   /api/bookings                        (Requires auth)
GET    /api/bookings/:id                    (Requires auth, own booking or admin)
PATCH  /api/bookings/:id                    (Requires auth, own booking or admin)
DELETE /api/bookings/:id                    (Requires auth, own booking or admin)
```

### Users

```
GET /api/users/:id/bookings                 (Requires auth, own bookings or admin)
GET /api/users/:id/bookings?status=confirmed&limit=10&offset=0  (Requires auth, own bookings or admin)
```

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
│   ├── bookings.repo.ts     # Booking data access
│   ├── rooms.repo.ts        # Room data access
│   └── users.repo.ts        # User data access
├── services/
│   ├── auth.service.ts      # Auth business logic (bcrypt, JWT)
│   ├── bookings.service.ts  # Booking business logic
│   ├── rooms.service.ts     # Room business logic
│   └── users.service.ts     # User business logic
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
