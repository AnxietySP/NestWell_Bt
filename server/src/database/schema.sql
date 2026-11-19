CREATE DATABASE IF NOT EXISTS nestwell_bt
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nestwell_bt;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS payment_schedules;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS favorite_caretakers;
DROP TABLE IF EXISTS children;
DROP TABLE IF EXISTS caretaker_profiles;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('PARENT', 'CARETAKER', 'ADMIN') NOT NULL,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verification_token VARCHAR(128) NULL,
  avatar_url VARCHAR(255) NULL,
  dzongkhag VARCHAR(80) NOT NULL DEFAULT 'Thimphu',
  address VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_dzongkhag (dzongkhag)
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_refresh_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE caretaker_profiles (
  user_id CHAR(36) PRIMARY KEY,
  bio TEXT NULL,
  years_experience TINYINT UNSIGNED NOT NULL DEFAULT 0,
  qualifications VARCHAR(255) NOT NULL,
  skills_json JSON NOT NULL,
  languages_json JSON NOT NULL,
  hourly_rate_btn DECIMAL(10, 2) NULL,
  daily_rate_btn DECIMAL(10, 2) NULL,
  monthly_rate_btn DECIMAL(10, 2) NOT NULL,
  verification_status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  id_document_path VARCHAR(255) NOT NULL,
  rejection_reason VARCHAR(255) NULL,
  verified_by CHAR(36) NULL,
  verified_at DATETIME NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  avg_rating DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
  total_reviews INT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_caretaker_status (verification_status, is_available)
) ENGINE=InnoDB;

CREATE TABLE children (
  id CHAR(36) PRIMARY KEY,
  parent_id CHAR(36) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  date_of_birth DATE NOT NULL,
  allergies VARCHAR(255) NULL,
  medical_notes TEXT NULL,
  special_instructions TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_children_parent (parent_id)
) ENGINE=InnoDB;

CREATE TABLE favorite_caretakers (
  parent_id CHAR(36) NOT NULL,
  caretaker_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (parent_id, caretaker_id),
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (caretaker_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE bookings (
  id CHAR(36) PRIMARY KEY,
  parent_id CHAR(36) NOT NULL,
  caretaker_id CHAR(36) NOT NULL,
  child_id CHAR(36) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_months TINYINT UNSIGNED NOT NULL,
  billing_arrangement ENUM('MONTHLY_INSTALLMENT', 'QUARTERLY_MILESTONE') NOT NULL DEFAULT 'MONTHLY_INSTALLMENT',
  agreed_monthly_rate_btn DECIMAL(10, 2) NOT NULL,
  estimated_total_btn DECIMAL(12, 2) NOT NULL,
  parent_notes TEXT NULL,
  status ENUM(
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'CONFIRMED',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'PENDING',
  cancellation_reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_min_six_months CHECK (duration_months >= 6),
  CONSTRAINT chk_valid_date_range CHECK (end_date > start_date),
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (caretaker_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_booking_caretaker_dates (caretaker_id, start_date, end_date, status),
  INDEX idx_booking_parent (parent_id, status)
) ENGINE=InnoDB;

CREATE TABLE reviews (
  id CHAR(36) PRIMARY KEY,
  booking_id CHAR(36) NOT NULL UNIQUE,
  parent_id CHAR(36) NOT NULL,
  caretaker_id CHAR(36) NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (caretaker_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(60) NOT NULL,
  title VARCHAR(140) NOT NULL,
  message TEXT NOT NULL,
  reference_id CHAR(36) NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user_read (user_id, is_read, created_at)
) ENGINE=InnoDB;

CREATE TABLE payment_schedules (
  id CHAR(36) PRIMARY KEY,
  booking_id CHAR(36) NOT NULL,
  installment_number TINYINT UNSIGNED NOT NULL,
  due_date DATE NOT NULL,
  amount_btn DECIMAL(10, 2) NOT NULL,
  gateway_provider VARCHAR(60) NULL,
  gateway_reference VARCHAR(120) NULL,
  status ENUM('UNPAID', 'PENDING_GATEWAY', 'PAID', 'FAILED') NOT NULL DEFAULT 'UNPAID',
  paid_at DATETIME NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;
