-- ==========================================================================
-- V6__add_employee_id.sql
--
-- Adds employee_id (5001-5999) as the 2nd column in app_users.
-- PostgreSQL does not support reordering columns in-place, so we drop and
-- recreate the table. This is safe because V5 already cleared all data.
--
-- Steps:
--   1. Drop app_sessions (has FK -> app_users, must go first)
--   2. Drop app_users
--   3. Recreate app_users with employee_id as 2nd column
--   4. Recreate all constraints, indexes from V1-V5
--   5. Recreate app_sessions with all its indexes
-- ==========================================================================

BEGIN;

-- 1. Drop dependent table first
DROP TABLE IF EXISTS app_sessions;

-- 2. Drop the main table
DROP TABLE IF EXISTS app_users;

-- 3. Recreate app_users with employee_id as 2nd column
--    Columns ordered: id, employee_id, name, email, password_hash,
--                     address, designation, role, is_active,
--                     password_updated_at, failed_login_attempts,
--                     locked_until, created_at, updated_at
CREATE TABLE app_users (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id           INTEGER                 NULL
                                                  UNIQUE
                                                  CHECK (employee_id >= 5001 AND employee_id <= 5999),
    name                  TEXT        NOT NULL,
    email                 TEXT        NOT NULL UNIQUE,
    password_hash         TEXT        NOT NULL,
    address               TEXT        NOT NULL,
    designation           TEXT        NOT NULL,
    role                  TEXT        NOT NULL DEFAULT 'GENERAL'
                                               CHECK (role IN ('ADMIN', 'GENERAL')),
    is_active             BOOLEAN     NOT NULL DEFAULT false,
    password_updated_at   TIMESTAMPTZ          NULL,
    failed_login_attempts INT         NOT NULL DEFAULT 0,
    locked_until          TIMESTAMPTZ          NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Recreate indexes
CREATE INDEX idx_app_users_email_lower
    ON app_users (LOWER(email));

CREATE INDEX idx_app_users_locked_until
    ON app_users (locked_until)
    WHERE locked_until IS NOT NULL;

CREATE INDEX idx_app_users_employee_id
    ON app_users (employee_id)
    WHERE employee_id IS NOT NULL;

-- 5. Recreate app_sessions
CREATE TABLE app_sessions (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL
                              REFERENCES app_users (id) ON DELETE CASCADE,
    session_token TEXT        NOT NULL UNIQUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at    TIMESTAMPTZ          NULL,
    ip_address    TEXT                 NULL,
    user_agent    TEXT                 NULL
);

CREATE INDEX idx_app_sessions_token
    ON app_sessions (session_token);

CREATE INDEX idx_app_sessions_user_id
    ON app_sessions (user_id);

COMMIT;
