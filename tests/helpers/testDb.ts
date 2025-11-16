/**
 * Test database utilities
 * Manages test database connection and test data
 */
import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

const TEST_DB_CONFIG = {
	host: process.env.TEST_DB_HOST || 'localhost',
	port: parseInt(process.env.TEST_DB_PORT || '3306'),
	user: process.env.TEST_DB_USER || 'root',
	password: process.env.TEST_DB_PASSWORD || '',
	database: process.env.TEST_DB_DATABASE || 'conference_booking_test',
	connectionLimit: 10,
	waitForConnections: true,
	queueLimit: 0,
	timezone: '+02:00',
};

/**
 * Test data IDs for easy reference
 */
export const TEST_IDS = {
	ADMIN_USER: 1,
	USER_1: 2,
	USER_2: 3,
	USER_3: 4,
	USER_4: 5,
	USER_5: 6,
	ROOM_1: 1,
	ROOM_2: 2,
	ROOM_3: 3,
	ROOM_4: 4,
	ROOM_5: 5,
};

class TestDb {
	/**
	 * Connect to test database
	 */
	async connect(): Promise<void> {
		if (!pool) {
			pool = mysql.createPool(TEST_DB_CONFIG);
		}
	}

	/**
	 * Get pool connection
	 */
	getPool(): mysql.Pool {
		if (!pool) {
			throw new Error('Database pool not initialized. Call connect() first.');
		}
		return pool;
	}

	/**
	 * Execute query
	 */
	async query<T = any>(sql: string, params?: any[]): Promise<T> {
		const [rows] = await this.getPool().execute(sql, params);
		return rows as T;
	}

	/**
	 * Setup database schema
	 */
	async setupSchema(): Promise<void> {
		// Create database if it doesn't exist
		const tempPool = mysql.createPool({
			...TEST_DB_CONFIG,
			database: undefined,
		});

		try {
			await tempPool.execute(
				`CREATE DATABASE IF NOT EXISTS ${TEST_DB_CONFIG.database}`
			);
		} finally {
			await tempPool.end();
		}

		// Create tables
		await this.query(`
			CREATE TABLE IF NOT EXISTS users (
				id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				email VARCHAR(255) NOT NULL UNIQUE,
				password_hash VARCHAR(255) NOT NULL,
				first_name VARCHAR(100) NOT NULL,
				last_name VARCHAR(100) NOT NULL,
				phone VARCHAR(20),
				role ENUM('user', 'admin') DEFAULT 'user' NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				INDEX idx_email (email),
				INDEX idx_name (last_name, first_name),
				INDEX idx_role (role)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`);

		await this.query(`
			CREATE TABLE IF NOT EXISTS rooms (
				id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				name VARCHAR(100) NOT NULL UNIQUE,
				capacity INT UNSIGNED NOT NULL,
				floor INT NOT NULL,
				description TEXT,
				is_active BOOLEAN DEFAULT TRUE,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				INDEX idx_capacity (capacity),
				INDEX idx_floor (floor),
				INDEX idx_active (is_active),
				CONSTRAINT chk_capacity CHECK (capacity > 0 AND capacity <= 100),
				CONSTRAINT chk_floor CHECK (floor >= 0)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`);

		await this.query(`
			CREATE TABLE IF NOT EXISTS bookings (
				id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				room_id INT UNSIGNED NOT NULL,
				user_id INT UNSIGNED NOT NULL,
				title VARCHAR(255) NOT NULL,
				description TEXT,
				start_time DATETIME NOT NULL,
				end_time DATETIME NOT NULL,
				status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'confirmed',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				CONSTRAINT fk_bookings_room
					FOREIGN KEY (room_id) REFERENCES rooms(id)
					ON DELETE RESTRICT
					ON UPDATE CASCADE,
				CONSTRAINT fk_bookings_user
					FOREIGN KEY (user_id) REFERENCES users(id)
					ON DELETE RESTRICT
					ON UPDATE CASCADE,
				CONSTRAINT chk_end_after_start
					CHECK (end_time > start_time),
				INDEX idx_room_time (room_id, start_time, end_time),
				INDEX idx_user_bookings (user_id, start_time),
				INDEX idx_status (status),
				INDEX idx_start_time (start_time),
				INDEX idx_end_time (end_time)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`);

		await this.query(`
			CREATE TABLE IF NOT EXISTS booking_invitations (
				id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				booking_id INT UNSIGNED NOT NULL,
				user_id INT UNSIGNED NOT NULL,
				status ENUM('pending', 'accepted', 'declined') NOT NULL DEFAULT 'pending',
				invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				responded_at TIMESTAMP NULL,
				CONSTRAINT fk_booking_invitations_booking
					FOREIGN KEY (booking_id) REFERENCES bookings(id)
					ON DELETE CASCADE
					ON UPDATE CASCADE,
				CONSTRAINT fk_booking_invitations_user
					FOREIGN KEY (user_id) REFERENCES users(id)
					ON DELETE CASCADE
					ON UPDATE CASCADE,
				UNIQUE KEY unique_booking_user (booking_id, user_id),
				INDEX idx_booking (booking_id),
				INDEX idx_user (user_id),
				INDEX idx_status (status)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`);

		// Create triggers for double-booking prevention
		await this.query('DROP TRIGGER IF EXISTS prevent_double_booking_insert;');
		await this.query('DROP TRIGGER IF EXISTS prevent_double_booking_update;');

		await this.query(`
			CREATE TRIGGER prevent_double_booking_insert
			BEFORE INSERT ON bookings
			FOR EACH ROW
			BEGIN
				DECLARE conflict_count INT;
				
				SELECT COUNT(*) INTO conflict_count
				FROM bookings
				WHERE room_id = NEW.room_id
				  AND status IN ('confirmed', 'pending')
				  AND id != IFNULL(NEW.id, 0)
				  AND (
					  (NEW.start_time >= start_time AND NEW.start_time < end_time)
					  OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
					  OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
				  );
				
				IF conflict_count > 0 THEN
					SIGNAL SQLSTATE '45000'
					SET MESSAGE_TEXT = 'Booking conflict: Room is already booked for the selected time period';
				END IF;
			END;
		`);

		await this.query(`
			CREATE TRIGGER prevent_double_booking_update
			BEFORE UPDATE ON bookings
			FOR EACH ROW
			BEGIN
				DECLARE conflict_count INT;
				
				IF NEW.room_id != OLD.room_id 
				   OR NEW.start_time != OLD.start_time 
				   OR NEW.end_time != OLD.end_time
				   OR NEW.status IN ('confirmed', 'pending') THEN
					
					SELECT COUNT(*) INTO conflict_count
					FROM bookings
					WHERE room_id = NEW.room_id
					  AND status IN ('confirmed', 'pending')
					  AND id != NEW.id
					  AND (
						  (NEW.start_time >= start_time AND NEW.start_time < end_time)
						  OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
						  OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
					  );
					
					IF conflict_count > 0 THEN
						SIGNAL SQLSTATE '45000'
						SET MESSAGE_TEXT = 'Booking conflict: Room is already booked for the selected time period';
					END IF;
				END IF;
			END;
		`);
	}

	/**
	 * Clean all tables
	 */
	async cleanDatabase(): Promise<void> {
		await this.query('SET FOREIGN_KEY_CHECKS = 0;');
		await this.query('TRUNCATE TABLE booking_invitations;');
		await this.query('TRUNCATE TABLE bookings;');
		await this.query('TRUNCATE TABLE rooms;');
		await this.query('TRUNCATE TABLE users;');
		await this.query('SET FOREIGN_KEY_CHECKS = 1;');
	}

	/**
	 * Seed test data
	 * Passwords: admin - 'admin123', users - 'password123'
	 */
	async seedTestData(): Promise<void> {
		// Insert test users
		// Password hashes: bcrypt with 10 rounds
		await this.query(`
			INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role) VALUES
			(1, 'admin@test.com', '$2a$10$.Dh6iKLLdls9j9HPmSIz8ON4sr03FfREdGn4A/shKEiSm90Q/ttUm', 'Admin', 'User', '+1-555-0100', 'admin'),
			(2, 'user1@test.com', '$2a$10$7RGiZN7CBBaTUBIQWiVrsuW461uacg1cbiZrBhkMIbkFA4S.s1ZyC', 'John', 'Doe', '+1-555-0101', 'user'),
			(3, 'user2@test.com', '$2a$10$7RGiZN7CBBaTUBIQWiVrsuW461uacg1cbiZrBhkMIbkFA4S.s1ZyC', 'Jane', 'Smith', '+1-555-0102', 'user'),
			(4, 'user3@test.com', '$2a$10$7RGiZN7CBBaTUBIQWiVrsuW461uacg1cbiZrBhkMIbkFA4S.s1ZyC', 'Bob', 'Johnson', '+1-555-0103', 'user'),
			(5, 'user4@test.com', '$2a$10$7RGiZN7CBBaTUBIQWiVrsuW461uacg1cbiZrBhkMIbkFA4S.s1ZyC', 'Alice', 'Williams', '+1-555-0104', 'user'),
			(6, 'user5@test.com', '$2a$10$7RGiZN7CBBaTUBIQWiVrsuW461uacg1cbiZrBhkMIbkFA4S.s1ZyC', 'Charlie', 'Brown', '+1-555-0105', 'user')
		`);

		// Insert test rooms
		await this.query(`
			INSERT INTO rooms (id, name, capacity, floor, description, is_active) VALUES
			(1, 'Executive Boardroom', 20, 5, 'Large boardroom for executive meetings', TRUE),
			(2, 'Innovation Lab', 12, 3, 'Creative space for brainstorming', TRUE),
			(3, 'Training Center', 30, 2, 'Spacious room for training sessions', TRUE),
			(4, 'Focus Room A', 4, 4, 'Small private room for discussions', TRUE),
			(5, 'Conference Room 1', 10, 3, 'Standard meeting room', TRUE)
		`);
	}

	/**
	 * Disconnect from database
	 */
	async disconnect(): Promise<void> {
		if (pool) {
			await pool.end();
			pool = null;
		}
	}

	/**
	 * Create a booking for testing
	 */
	async createBooking(data: {
		room_id: number;
		user_id: number;
		title: string;
		description?: string;
		start_time: string;
		end_time: string;
		status?: string;
	}): Promise<number> {
		const result: any = await this.query(
			`INSERT INTO bookings (room_id, user_id, title, description, start_time, end_time, status)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				data.room_id,
				data.user_id,
				data.title,
				data.description || '',
				data.start_time,
				data.end_time,
				data.status || 'confirmed',
			]
		);
		return result.insertId;
	}

	/**
	 * Create an invitation for testing
	 */
	async createInvitation(data: {
		booking_id: number;
		user_id: number;
		status?: string;
	}): Promise<number> {
		const result: any = await this.query(
			`INSERT INTO booking_invitations (booking_id, user_id, status)
			 VALUES (?, ?, ?)`,
			[data.booking_id, data.user_id, data.status || 'pending']
		);
		return result.insertId;
	}
}

export const testDb = new TestDb();
