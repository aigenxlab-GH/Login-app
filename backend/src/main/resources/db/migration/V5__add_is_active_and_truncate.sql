-- V5: Add is_active column and clear all existing data for a fresh start.
-- First user created after this migration will be auto-activated (handled in application code).

-- Clear sessions first (foreign key dependency on app_users)
DELETE FROM app_sessions;

-- Clear all users
DELETE FROM app_users;

-- Add is_active column (default false — all new accounts start inactive)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;
