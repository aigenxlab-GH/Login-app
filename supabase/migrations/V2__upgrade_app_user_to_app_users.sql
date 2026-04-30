-- ==========================================================================
-- V2__upgrade_app_user_to_app_users.sql
--
-- What this migration does:
--   1. Renames app_user  →  app_users  (standardise to plural naming).
--   2. Renames the automatically-generated PK and UNIQUE constraint names so
--      they match the new table name (cosmetic – the constraints still work
--      either way, but consistent naming prevents confusion).
--   3. Renames the existing lower-email index.
--   4. Adds three new auth-hardening columns:
--        password_updated_at  – tracks when the password was last changed
--        failed_login_attempts – brute-force counter; reset on successful login
--        locked_until          – account lock expiry (NULL = not locked)
-- ==========================================================================

BEGIN;

-- 1. Rename the table.
ALTER TABLE app_user RENAME TO app_users;

-- 2. Rename auto-generated constraint names that Postgres bakes the old table
--    name into.  These renames are safe to run even if the constraint was
--    created with a different explicit name – just update the names below if
--    yours differ.
ALTER TABLE app_users
    RENAME CONSTRAINT app_user_pkey TO app_users_pkey;

ALTER TABLE app_users
    RENAME CONSTRAINT app_user_email_key TO app_users_email_key;

-- 3. Rename the existing index.
ALTER INDEX idx_app_user_email_lower
    RENAME TO idx_app_users_email_lower;

-- 4. Add the new auth-hardening columns.
ALTER TABLE app_users
    ADD COLUMN password_updated_at   TIMESTAMPTZ                    NULL,
    ADD COLUMN failed_login_attempts INT         NOT NULL DEFAULT 0,
    ADD COLUMN locked_until          TIMESTAMPTZ                    NULL;

-- Optional: index for efficient locked-account look-ups.
CREATE INDEX idx_app_users_locked_until
    ON app_users (locked_until)
    WHERE locked_until IS NOT NULL;

COMMIT;
