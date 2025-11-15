-- ============================================================================
-- Conference Room Booking System - Database Schema
-- MySQL 8+ Compatible
-- ============================================================================
-- This schema supports a co-working space booking management system with:
-- - User management
-- - Room inventory with amenities
-- - Booking reservations with conflict prevention
-- - Business rules enforcement (hours, duration limits)
-- ============================================================================

-- Drop existing database if it exists and create fresh
DROP DATABASE IF EXISTS conference_booking;
CREATE DATABASE conference_booking
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE conference_booking;

-- ============================================================================
-- TABLE: users
-- ============================================================================
-- Stores user accounts for the booking system
-- Each user can create and manage multiple bookings
-- Includes authentication fields (password_hash) and role-based access control
-- ============================================================================
CREATE TABLE users (
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

-- ============================================================================
-- TABLE: rooms
-- ============================================================================
-- Conference rooms available for booking
-- Each room has a capacity and can have multiple amenities
-- ============================================================================
CREATE TABLE rooms (
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

-- ============================================================================
-- TABLE: amenities
-- ============================================================================
-- Features and equipment available in conference rooms
-- Examples: Projector, Whiteboard, Video Conferencing, etc.
-- ============================================================================
CREATE TABLE amenities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: room_amenities
-- ============================================================================
-- Join table linking rooms to their available amenities
-- Many-to-many relationship between rooms and amenities
-- ============================================================================
CREATE TABLE room_amenities (
    room_id INT UNSIGNED NOT NULL,
    amenity_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (room_id, amenity_id),
    
    CONSTRAINT fk_room_amenities_room
        FOREIGN KEY (room_id) REFERENCES rooms(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_room_amenities_amenity
        FOREIGN KEY (amenity_id) REFERENCES amenities(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    INDEX idx_amenity (amenity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: bookings
-- ============================================================================
-- Conference room reservations
-- Enforces business rules through constraints and indexes
-- 
-- BUSINESS RULES (enforced in application logic):
-- 1. Business hours: 9 AM - 5 PM (09:00 - 17:00)
-- 2. Minimum duration: 30 minutes
-- 3. Maximum duration: 4 hours (240 minutes)
-- 4. No double-booking (enforced via unique index on overlapping times)
-- ============================================================================
CREATE TABLE bookings (
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
    
    -- Foreign key constraints
    CONSTRAINT fk_bookings_room
        FOREIGN KEY (room_id) REFERENCES rooms(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_bookings_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    
    -- Business rule constraints
    CONSTRAINT chk_end_after_start
        CHECK (end_time > start_time),
    
    -- Indexes for performance and conflict detection
    INDEX idx_room_time (room_id, start_time, end_time),
    INDEX idx_user_bookings (user_id, start_time),
    INDEX idx_status (status),
    INDEX idx_start_time (start_time),
    INDEX idx_end_time (end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TRIGGER: Prevent Double Booking
-- ============================================================================
-- This trigger prevents overlapping bookings for the same room
-- Two bookings overlap if: start_time < existing_end AND end_time > existing_start
-- Only checks against confirmed and pending bookings (not cancelled)
-- ============================================================================
DELIMITER //

CREATE TRIGGER prevent_double_booking_insert
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
    DECLARE conflict_count INT;
    
    -- Check for overlapping bookings in the same room
    SELECT COUNT(*) INTO conflict_count
    FROM bookings
    WHERE room_id = NEW.room_id
      AND status IN ('confirmed', 'pending')
      AND id != IFNULL(NEW.id, 0)
      AND (
          -- New booking starts during existing booking
          (NEW.start_time >= start_time AND NEW.start_time < end_time)
          -- New booking ends during existing booking
          OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
          -- New booking completely encompasses existing booking
          OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      );
    
    IF conflict_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Booking conflict: Room is already booked for the selected time period';
    END IF;
END//

CREATE TRIGGER prevent_double_booking_update
BEFORE UPDATE ON bookings
FOR EACH ROW
BEGIN
    DECLARE conflict_count INT;
    
    -- Only check if time or room changes, or status changes to confirmed/pending
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
END//

DELIMITER ;

-- ============================================================================
-- TABLE: booking_invitations
-- ============================================================================
-- Tracks which users are invited to bookings
-- Allows collaborative bookings where multiple users can attend
-- Only the booking owner can invite/remove users
-- ============================================================================
CREATE TABLE booking_invitations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    status ENUM('pending', 'accepted', 'declined') NOT NULL DEFAULT 'pending',
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    
    -- Constraints
    CONSTRAINT fk_booking_invitations_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_booking_invitations_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    -- Prevent duplicate invitations
    UNIQUE KEY unique_booking_user (booking_id, user_id),
    
    -- Indexes for query performance
    INDEX idx_booking (booking_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SAMPLE DATA - USERS
-- ============================================================================
-- Note: In production, passwords should be hashed using bcrypt with a proper salt
-- These are real bcrypt-hashed passwords for testing purposes
-- Password for all users: 'password123' (bcrypt hashed)
-- Admin password: 'admin123' (bcrypt hashed)
INSERT INTO users (email, password_hash, first_name, last_name, phone, role) VALUES
('admin@example.com', '$2a$10$.Dh6iKLLdls9j9HPmSIz8ON4sr03FfREdGn4A/shKEiSm90Q/ttUm', 'Admin', 'User', '+1-555-0100', 'admin'),
('john.doe@example.com', '$2a$10$7RGiZN7CBBaTUBIQWiVrsuW461uacg1cbiZrBhkMIbkFA4S.s1ZyC', 'John', 'Doe', '+1-555-0101', 'user'),
('jane.smith@example.com', '$2a$10$7RGiZN7CBBaTUBIQWiVrsuW461uacg1cbiZrBhkMIbkFA4S.s1ZyC', 'Jane', 'Smith', '+1-555-0102', 'user'),
('bob.johnson@example.com', '$2a$10$7RGiZN7CBBaTUBIQWiVrsuW461uacg1cbiZrBhkMIbkFA4S.s1ZyC', 'Bob', 'Johnson', '+1-555-0103', 'user'),
('alice.williams@example.com', '$2a$10$7RGiZN7CBBaTUBIQWiVrsuW461uacg1cbiZrBhkMIbkFA4S.s1ZyC', 'Alice', 'Williams', '+1-555-0104', 'user'),
('charlie.brown@example.com', '$2a$10$7RGiZN7CBBaTUBIQWiVrsuW461uacg1cbiZrBhkMIbkFA4S.s1ZyC', 'Charlie', 'Brown', '+1-555-0105', 'user');

-- ============================================================================
-- SAMPLE DATA - ROOMS
-- ============================================================================
INSERT INTO rooms (name, capacity, floor, description, is_active) VALUES
('Executive Boardroom', 20, 5, 'Large boardroom with premium furnishings, perfect for executive meetings and presentations', TRUE),
('Innovation Lab', 12, 3, 'Creative space with whiteboards and collaborative seating for brainstorming sessions', TRUE),
('Training Center', 30, 2, 'Spacious room designed for workshops and training sessions with theater-style seating', TRUE),
('Focus Room A', 4, 4, 'Small private room ideal for intimate team discussions and one-on-ones', TRUE),
('Focus Room B', 4, 4, 'Compact meeting space for small group collaborations', TRUE),
('Conference Room 1', 10, 3, 'Standard meeting room with modern AV equipment', TRUE),
('Conference Room 2', 8, 3, 'Mid-size meeting space with natural lighting', TRUE);

-- ============================================================================
-- SAMPLE DATA - AMENITIES
-- ============================================================================
INSERT INTO amenities (name, description, icon) VALUES
('Projector', '4K projector with wireless screen sharing capability', 'projector'),
('Whiteboard', 'Large wall-mounted whiteboard with markers', 'whiteboard'),
('Video Conferencing', 'Professional video conferencing system with camera and microphones', 'video'),
('Conference Phone', 'High-quality speakerphone for conference calls', 'phone'),
('Smart TV', '65-inch 4K Smart TV with HDMI and wireless casting', 'tv'),
('Coffee Service', 'Complimentary coffee and tea service', 'coffee'),
('Standing Desks', 'Adjustable standing desks available', 'desk'),
('Natural Light', 'Windows with abundant natural lighting', 'sun'),
('Accessibility', 'ADA compliant with wheelchair access', 'accessibility');

-- ============================================================================
-- SAMPLE DATA - ROOM AMENITIES
-- ============================================================================
-- Executive Boardroom: Premium amenities
INSERT INTO room_amenities (room_id, amenity_id) VALUES
(1, 1), -- Projector
(1, 3), -- Video Conferencing
(1, 4), -- Conference Phone
(1, 5), -- Smart TV
(1, 6), -- Coffee Service
(1, 8), -- Natural Light
(1, 9); -- Accessibility

-- Innovation Lab: Creative tools
INSERT INTO room_amenities (room_id, amenity_id) VALUES
(2, 2), -- Whiteboard
(2, 3), -- Video Conferencing
(2, 5), -- Smart TV
(2, 7), -- Standing Desks
(2, 8); -- Natural Light

-- Training Center: Presentation focused
INSERT INTO room_amenities (room_id, amenity_id) VALUES
(3, 1), -- Projector
(3, 3), -- Video Conferencing
(3, 4), -- Conference Phone
(3, 6), -- Coffee Service
(3, 9); -- Accessibility

-- Focus Room A & B: Basic amenities
INSERT INTO room_amenities (room_id, amenity_id) VALUES
(4, 2), -- Whiteboard
(4, 5), -- Smart TV
(4, 8), -- Natural Light
(5, 2), -- Whiteboard
(5, 3), -- Video Conferencing
(5, 8); -- Natural Light

-- Conference Rooms: Standard setup
INSERT INTO room_amenities (room_id, amenity_id) VALUES
(6, 1), -- Projector
(6, 2), -- Whiteboard
(6, 3), -- Video Conferencing
(6, 4), -- Conference Phone
(6, 8), -- Natural Light
(7, 2), -- Whiteboard
(7, 3), -- Video Conferencing
(7, 5), -- Smart TV
(7, 8); -- Natural Light

-- ============================================================================
-- SAMPLE DATA - BOOKINGS
-- ============================================================================
-- Sample bookings demonstrating various time slots within business hours
-- All times are within 9 AM - 5 PM constraint
-- Note: user_id 1 is now the admin user
-- ============================================================================
INSERT INTO bookings (room_id, user_id, title, description, start_time, end_time, status) VALUES
-- Today's bookings
(1, 2, 'Q4 Strategy Meeting', 'Quarterly business review and planning session', 
    '2025-11-12 09:00:00', '2025-11-12 11:00:00', 'confirmed'),

(2, 3, 'Product Design Workshop', 'Collaborative session for new product features', 
    '2025-11-12 10:00:00', '2025-11-12 12:30:00', 'confirmed'),

(6, 4, 'Team Standup', 'Daily team synchronization meeting', 
    '2025-11-12 09:30:00', '2025-11-12 10:00:00', 'confirmed'),

(4, 5, 'Client Presentation', 'Present proposal to prospective client', 
    '2025-11-12 14:00:00', '2025-11-12 15:30:00', 'confirmed'),

-- Tomorrow's bookings
(3, 6, 'Sales Training', 'Product knowledge training for sales team', 
    '2025-11-13 09:00:00', '2025-11-13 13:00:00', 'confirmed'),

(1, 3, 'Board Meeting', 'Monthly board of directors meeting', 
    '2025-11-13 13:00:00', '2025-11-13 17:00:00', 'confirmed'),

(7, 2, 'Interview - Senior Developer', 'Technical interview session', 
    '2025-11-13 10:00:00', '2025-11-13 11:00:00', 'confirmed'),

-- Future bookings
(2, 4, 'Innovation Brainstorm', 'Brainstorming session for new initiatives', 
    '2025-11-14 11:00:00', '2025-11-14 12:30:00', 'pending'),

(5, 5, 'One-on-One Review', 'Performance review meeting', 
    '2025-11-14 14:00:00', '2025-11-14 15:00:00', 'confirmed'),

-- Past bookings (completed)
(6, 6, 'Marketing Review', 'Campaign performance analysis', 
    '2025-11-11 10:00:00', '2025-11-11 11:30:00', 'completed');

-- ============================================================================
-- SAMPLE DATA - BOOKING INVITATIONS
-- ============================================================================
-- Invite users to existing bookings
INSERT INTO booking_invitations (booking_id, user_id, status, responded_at) VALUES
-- Jane (user_id=3) invited to John's Q4 Strategy Meeting (booking_id=1)
(1, 3, 'accepted', '2025-11-11 08:30:00'),
-- Bob (user_id=4) invited to John's Q4 Strategy Meeting
(1, 4, 'accepted', '2025-11-11 09:00:00'),
-- John (user_id=2) invited to Jane's Product Design Workshop (booking_id=2)
(2, 2, 'accepted', '2025-11-11 13:45:00'),
-- Alice (user_id=5) invited to Jane's Product Design Workshop
(2, 5, 'pending', NULL),
-- Charlie (user_id=6) invited to Alice's Team Standup (booking_id=3)
(3, 6, 'accepted', '2025-11-11 16:20:00'),
-- Bob (user_id=4) invited to Alice's Client Presentation (booking_id=4)
(4, 4, 'declined', '2025-11-12 09:15:00');

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
