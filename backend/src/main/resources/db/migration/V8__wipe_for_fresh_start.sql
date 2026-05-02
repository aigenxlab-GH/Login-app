-- V8: Wipe all data again for a fresh start.
-- Sessions deleted first (FK → app_users).
DELETE FROM app_sessions;
DELETE FROM app_users;
