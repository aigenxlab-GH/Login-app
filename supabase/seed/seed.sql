-- ============================================================
-- seed.sql — local development seed data
--
-- Inserts test users with BCrypt-hashed passwords so you can
-- log in immediately after a fresh local database setup.
--
-- Usage:
--   supabase db reset               (applies migrations + seed)
--   psql $DATABASE_URL -f seed.sql  (manual apply)
--
-- ALL PASSWORDS ARE "password123" (BCrypt, cost 12).
-- These are test-only accounts — never use in staging/production.
-- ============================================================

INSERT INTO app_user (name, email, password_hash, address, designation)
VALUES
  (
    'Alice Admin',
    'alice@example.com',
    -- password: password123
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5oKkxlbpLu',
    '1 Admin Street, Springfield',
    'System Administrator'
  ),
  (
    'Bob Developer',
    'bob@example.com',
    -- password: password123
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5oKkxlbpLu',
    '2 Dev Lane, Shelbyville',
    'Senior Developer'
  )
ON CONFLICT (email) DO NOTHING;
