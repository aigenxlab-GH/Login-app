-- V7: Wipe all data for a fresh start.
-- Sessions must be deleted first (FK → app_users).
DELETE FROM app_sessions;
DELETE FROM app_users;
