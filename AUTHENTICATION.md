# Authentication Implementation Summary

## Overview

This document summarizes the JWT-based authentication and role-based authorization system implemented for the Conference Room Booking API.

## Implementation Tasks

### ✅ Task 1: Auth Dependencies and Schemas

- Added `bcryptjs` and `jsonwebtoken` packages
- Created authentication Zod schemas in `src/domain/zod/auth.schema.ts`
- Defined `UserRole` enum (`user`, `admin`)
- Created `TokenPayload`, `RegisterInput`, `LoginInput`, `LoginResponse` interfaces

### ✅ Task 2: Database Schema Updates

- Modified `users` table to include:
  - `password_hash VARCHAR(255)` - bcrypt hashed passwords
  - `role ENUM('user', 'admin') DEFAULT 'user'` - user roles
- Updated sample data with 6 users including admin account
- Admin credentials: `admin@example.com` / `admin123`

### ✅ Task 3: Auth Middleware and Utilities

- **JWT Utilities** (`src/utils/jwt.ts`):
  - `signToken()` - Generate JWT tokens
  - `verifyToken()` - Validate and decode tokens
  - `extractTokenFromHeader()` - Parse Bearer tokens
- **Auth Middleware** (`src/middlewares/auth.ts`):
  - `authenticate()` - Verify JWT and attach user to request
  - `requireRole(...roles)` - Check user has required role(s)
  - `optionalAuth()` - Optional authentication

### ✅ Task 4: Auth Repository and Service

- **Auth Repository** (`src/repositories/auth.repo.ts`):
  - `findByEmailWithPassword()` - Fetch user with password hash
  - `create()` - Create new user account
  - `emailExists()` - Check if email is already registered
- **Auth Service** (`src/services/auth.service.ts`):
  - `register()` - Create account with bcrypt password hashing (10 rounds)
  - `login()` - Validate credentials and generate JWT
  - `getCurrentUser()` - Get authenticated user details

### ✅ Task 5: Auth Controller and Routes

- **Auth Controller** (`src/controllers/auth.controller.ts`):
  - `register` - POST /auth/register
  - `login` - POST /auth/login
  - `getCurrentUser` - GET /auth/me
- **Routes** (`src/routes/auth.routes.ts`):
  - Mounted at `/api/auth`
  - Public endpoints: register, login
  - Protected endpoint: /me (requires auth)

### ✅ Task 6: Authorization on Existing Endpoints

- Protected all routes with `authenticate` middleware
- Added admin-only endpoint: `GET /bookings` (all bookings)
- Implemented ownership checks in controllers:
  - Users can only view/modify their own bookings
  - Admins can view/modify any booking

**Changes:**

- `src/routes/bookings.routes.ts` - Added `authenticate` and `requireRole('admin')`
- `src/routes/rooms.routes.ts` - Added `authenticate`
- `src/routes/users.routes.ts` - Added `authenticate`
- `src/controllers/bookings.controller.ts` - Added ownership validation
- `src/controllers/users.controller.ts` - Added ownership validation

### ✅ Task 7: Services for Role-Based Access

- Added `getAllBookings()` in `BookingsService` for admin access
- Added `findAll()` repository method with filters:
  - `status` - Filter by booking status
  - `room_id` - Filter by room
  - `user_id` - Filter by user
  - `limit` / `offset` - Pagination
- Created `getAllBookingsSchema` for query validation

### ✅ Task 8: Update Documentation and Test Requests

- **Updated `requests.http`**:
  - Added authentication examples (register, login)
  - Added `@authToken` variable for easy token reuse
  - Updated all protected endpoints with Authorization header
  - Added admin-only endpoint examples
- **Updated `README.md`**:
  - Added authentication section with flow explanation
  - Documented all auth endpoints with examples
  - Added role-based access control table
  - Updated error codes to include 401/403
  - Updated project structure with auth files
  - Added JWT environment variables documentation
  - Default admin credentials documented

## Security Features

- **Password Security**: bcrypt hashing with 10 salt rounds
- **Token Security**: JWT with configurable expiration (default 7 days)
- **Authorization**: Role-based access control (admin vs user)
- **Ownership Validation**: Users can only access their own resources
- **Environment Config**: Secure secrets via environment variables

## Role-Based Access Control

| Endpoint                | User      | Admin     |
| ----------------------- | --------- | --------- |
| POST /auth/register     | ✅ Public | ✅ Public |
| POST /auth/login        | ✅ Public | ✅ Public |
| GET /auth/me            | ✅        | ✅        |
| GET /rooms              | ✅        | ✅        |
| GET /bookings           | ❌        | ✅ All    |
| POST /bookings          | ✅ Own    | ✅ Any    |
| GET /bookings/:id       | ✅ Own    | ✅ Any    |
| PATCH /bookings/:id     | ✅ Own    | ✅ Any    |
| DELETE /bookings/:id    | ✅ Own    | ✅ Any    |
| GET /users/:id/bookings | ✅ Own    | ✅ Any    |

## Environment Variables

Add to `.env`:

```env
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

## Testing

Use `requests.http` for manual testing:

1. Login as user: `john@example.com` / `password123`
2. Login as admin: `admin@example.com` / `admin123`
3. Copy token from response
4. Replace `@authToken` variable
5. Test protected endpoints

## Migration Notes

For existing deployments:

1. Run updated `setup_database.sql` to add `password_hash` and `role` columns
2. Update `.env` with `JWT_SECRET` and `JWT_EXPIRES_IN`
3. Install new dependencies: `npm install`
4. Restart server: `npm run dev`
5. **Important**: Change default admin password!

## Files Modified

**New Files:**

- `src/domain/zod/auth.schema.ts`
- `src/middlewares/auth.ts`
- `src/utils/jwt.ts`
- `src/repositories/auth.repo.ts`
- `src/services/auth.service.ts`
- `src/controllers/auth.controller.ts`
- `src/routes/auth.routes.ts`

**Modified Files:**

- `setup_database.sql`
- `package.json`
- `.env.example`
- `src/config/env.ts`
- `src/types/express.d.ts`
- `src/domain/zod/users.schema.ts`
- `src/domain/zod/bookings.schema.ts`
- `src/routes/index.ts`
- `src/routes/bookings.routes.ts`
- `src/routes/rooms.routes.ts`
- `src/routes/users.routes.ts`
- `src/repositories/bookings.repo.ts`
- `src/services/bookings.service.ts`
- `src/controllers/bookings.controller.ts`
- `src/controllers/users.controller.ts`
- `requests.http`
- `README.md`
