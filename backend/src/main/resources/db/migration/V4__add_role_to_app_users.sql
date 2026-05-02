-- V4: Add role column to app_users
-- Existing users default to GENERAL. Role values: ADMIN, GENERAL.

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'GENERAL';

-- Constrain to known values
ALTER TABLE app_users ADD CONSTRAINT chk_app_users_role
    CHECK (role IN ('ADMIN', 'GENERAL'));
