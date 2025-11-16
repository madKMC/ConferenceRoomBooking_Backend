# Test Suite Documentation

## Overview

This test suite provides comprehensive coverage for the Conference Room Booking API using Jest and Supertest. It includes both integration tests (testing endpoints end-to-end) and unit tests (testing individual components in isolation).

## Test Statistics

- **Total Test Files**: 13
- **Total Test Cases**: ~130+
- **Integration Tests**: 8 files, ~100 test cases
- **Unit Tests**: 5 files, ~30 test cases

## Prerequisites

### 1. MySQL Test Database

Create a separate test database to avoid affecting development data:

```sql
CREATE DATABASE conference_booking_test;
```

### 2. Environment Configuration

Create a `.env` file or set environment variables for tests:

```bash
# Copy the example
cp .env.test.example .env

# Edit with your test database credentials
TEST_DB_HOST=localhost
TEST_DB_PORT=3306
TEST_DB_USER=root
TEST_DB_PASSWORD=your_password
TEST_DB_DATABASE=conference_booking_test
JWT_SECRET=test-secret-key
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Integration tests only
npm run test:integration

# Unit tests only
npm run test:unit

# Watch mode (re-run on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

### Run Individual Test Files

```bash
# Run a specific test file
npx jest tests/integration/auth.test.ts

# Run tests matching a pattern
npx jest --testNamePattern="should successfully login"
```

## Test Structure

```
tests/
├── setup.ts                              # Global test configuration
├── helpers/
│   ├── testDb.ts                        # Database utilities & test data factories
│   └── authHelper.ts                    # JWT token generation helpers
├── mocks/
│   └── mailer.mock.ts                   # Email service mock
├── integration/                         # End-to-end API tests
│   ├── auth.test.ts                    # Authentication endpoints
│   ├── rooms.test.ts                   # Room management endpoints
│   ├── bookings.test.ts                # Booking system endpoints
│   ├── invitations.test.ts             # Invitation system endpoints
│   ├── users.test.ts                   # User management endpoints
│   ├── analytics.test.ts               # Analytics endpoints
│   ├── email.test.ts                   # Email endpoints
│   └── error-handling.test.ts          # Error response testing
└── unit/                               # Component isolation tests
    ├── middlewares/
    │   ├── auth.test.ts               # Auth middleware
    │   └── correlationId.test.ts      # Correlation ID middleware
    └── services/
        ├── auth.service.test.ts       # Auth service
        └── notifications/
            └── bookingNotification.test.ts  # Email notifications
```

## Test Coverage by Feature

### ✅ Authentication & Authorization

**Files**: `auth.test.ts`, `auth.service.test.ts`, `auth.middleware.test.ts`

- User registration with validation
- Email uniqueness enforcement
- Password hashing (bcrypt, 10 rounds)
- User login with credentials
- JWT token generation and verification
- Token expiration handling
- Invalid token rejection
- Role-based access control (admin/user)
- Current user retrieval

### ✅ Room Management

**Files**: `rooms.test.ts`

- List all rooms with pagination
- Filter by capacity and floor
- Get single room details
- Check room availability by date
- View room bookings for a date
- Admin-only room creation
- Admin-only room updates
- Admin-only room deletion (soft delete)
- Authorization checks (403 for users)

### ✅ Booking System

**Files**: `bookings.test.ts`

**Core Operations:**
- Create valid bookings
- Detect booking conflicts (409)
- Update bookings
- Cancel bookings
- Owner/invitee access control

**Business Rules:**
- Booking hours: 9 AM - 5 PM enforcement
- Duration limits: 30 min - 4 hours
- Room validation

**DateTime Format Support:**
- ISO 8601 without timezone
- UTC format
- With milliseconds
- With timezone offset
- Invalid format rejection

**Concurrency & Transactions:**
- Race condition handling (5 concurrent attempts, only 1 succeeds)
- Transaction rollback on errors
- Database row-level locking

### ✅ Invitation System

**Files**: `invitations.test.ts`

- Add invitees to bookings (1-20 users)
- Duplicate invitation handling (reset to pending)
- View invitees list
- Remove invitees
- Accept/decline invitations
- Invitation expiration (after booking start)
- Owner-only permissions
- Email notifications (mocked)

### ✅ User Management

**Files**: `users.test.ts`

- List users with search and pagination
- Get user bookings
- Owner vs invitee role distinction
- Room details in booking responses
- Filter bookings by status
- Admin access to all user bookings
- User access only to own bookings

### ✅ Analytics

**Files**: `analytics.test.ts`

- Room utilization reports (8-hour business day)
- Daily booking trends
- User booking summary
- Date range filtering
- Admin-only access
- User can view own summary
- Cancellation rate calculations

### ✅ Email Notifications

**Files**: `email.test.ts`, `bookingNotification.test.ts`

- Invitation emails
- Acceptance notifications
- Cancellation notices
- Email content validation
- SMTP configuration verification
- Test email sending
- Async email handling (non-blocking)

### ✅ Error Handling

**Files**: `error-handling.test.ts`

- 400 Bad Request (invalid parameters)
- 401 Unauthorized (missing/expired/invalid tokens)
- 403 Forbidden (insufficient permissions)
- 404 Not Found (non-existent resources)
- 409 Conflict (double bookings, duplicate emails)
- 422 Validation Error (Zod schema failures)
- Correlation ID in all error responses
- Consistent error format

## Test Helpers

### Database Helper (`testDb`)

```typescript
import { testDb, TEST_IDS } from './helpers/testDb';

// Create test booking
const bookingId = await testDb.createBooking({
  room_id: TEST_IDS.ROOM_1,
  user_id: TEST_IDS.USER_1,
  title: 'Test Meeting',
  start_time: '2025-12-20 10:00:00',
  end_time: '2025-12-20 11:00:00',
});

// Create invitation
await testDb.createInvitation({
  booking_id: bookingId,
  user_id: TEST_IDS.USER_2,
  status: 'accepted',
});
```

### Auth Helper

```typescript
import {
  generateAdminToken,
  generateUserToken,
  getAdminAuthHeader,
  getUserAuthHeader,
  TEST_CREDENTIALS,
} from './helpers/authHelper';

// Get auth headers for requests
const response = await request(app)
  .get('/api/rooms')
  .set(getUserAuthHeader());

// Generate custom token
const token = generateUserToken(TEST_IDS.USER_1);
```

## Writing New Tests

### Integration Test Template

```typescript
import request from 'supertest';
import { createApp } from '../../src/app';
import { getUserAuthHeader } from '../helpers/authHelper';
import { testDb, TEST_IDS } from '../helpers/testDb';

const app = createApp();

describe('Feature Integration Tests', () => {
  beforeEach(async () => {
    // Setup test data
    await testDb.createBooking({...});
  });

  it('should do something', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .set(getUserAuthHeader());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Unit Test Template

```typescript
import { MyService } from '../../../src/services/my.service';
import { MyRepository } from '../../../src/repositories/my.repo';

jest.mock('../../../src/repositories/my.repo');

describe('My Service Unit Tests', () => {
  let service: MyService;
  let mockRepo: jest.Mocked<MyRepository>;

  beforeEach(() => {
    service = new MyService();
    mockRepo = (service as any).repo;
    jest.clearAllMocks();
  });

  it('should do something', async () => {
    mockRepo.someMethod = jest.fn().mockResolvedValue({...});

    const result = await service.someMethod();

    expect(mockRepo.someMethod).toHaveBeenCalled();
    expect(result).toEqual({...});
  });
});
```

## Test Data

### Default Test Users

The test database is seeded with these users:

| ID | Email | Password | Role |
|----|-------|----------|------|
| 1 | admin@test.com | admin123 | admin |
| 2 | user1@test.com | password123 | user |
| 3 | user2@test.com | password123 | user |
| 4 | user3@test.com | password123 | user |
| 5 | user4@test.com | password123 | user |
| 6 | user5@test.com | password123 | user |

### Default Test Rooms

| ID | Name | Capacity | Floor |
|----|------|----------|-------|
| 1 | Executive Boardroom | 20 | 5 |
| 2 | Innovation Lab | 12 | 3 |
| 3 | Training Center | 30 | 2 |
| 4 | Focus Room A | 4 | 4 |
| 5 | Conference Room 1 | 10 | 3 |

## Troubleshooting

### Database Connection Issues

```bash
# Check if MySQL is running
mysql -u root -p

# Verify test database exists
SHOW DATABASES LIKE 'conference_booking_test';

# Check environment variables
echo $TEST_DB_HOST
echo $TEST_DB_DATABASE
```

### Test Timeouts

If tests timeout, increase the timeout in `jest.config.js`:

```javascript
testTimeout: 60000, // 60 seconds
```

### Cleaning Test Database

```bash
# Drop and recreate test database
mysql -u root -p -e "DROP DATABASE IF EXISTS conference_booking_test; CREATE DATABASE conference_booking_test;"
```

### Port Conflicts

If the test server fails to start due to port conflicts, ensure no other instance is running:

```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process if needed
kill -9 <PID>
```

## Coverage Reports

After running tests with coverage:

```bash
npm run test:coverage
```

View the HTML report:

```bash
# Open in browser
open coverage/index.html
```

Coverage is configured to exclude:
- Type definition files (`*.d.ts`)
- Server entry point (`server.ts`)
- Type directories

## Continuous Integration

For CI/CD pipelines, use:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm test
  env:
    TEST_DB_HOST: localhost
    TEST_DB_USER: root
    TEST_DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
    TEST_DB_DATABASE: conference_booking_test
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Database is cleaned before each test
3. **Mocking**: External services (email) are mocked
4. **Descriptive Names**: Test names clearly describe what is being tested
5. **Arrange-Act-Assert**: Follow AAA pattern in tests
6. **Edge Cases**: Test both happy paths and error conditions

## Known Limitations

1. **Repository Unit Tests**: Not implemented - integration tests provide good coverage
2. **Validate Middleware Tests**: Not implemented - tested indirectly through integration tests
3. **Error Handler Middleware**: Not implemented - tested through error-handling integration tests
4. **Database Triggers**: Tested only through conflict scenarios

## Contributing

When adding new features:

1. Write integration tests first
2. Add unit tests for complex business logic
3. Ensure tests pass before committing
4. Aim for >80% code coverage
5. Update this README with new test files
