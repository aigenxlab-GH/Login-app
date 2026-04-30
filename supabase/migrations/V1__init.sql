-- ============================================================
-- V1__init.sql — Login App initial schema
--
-- This file mirrors backend/src/main/resources/db/migration/V1__init.sql.
-- It is here for use with the Supabase CLI (`supabase db push` or
-- `supabase migration new`). The authoritative version for the application
-- runtime is the one in backend/src/main/resources/db/migration/.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE app_user (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,
    email           TEXT        NOT NULL UNIQUE,
    password_hash   TEXT        NOT NULL,
    address         TEXT        NOT NULL,
    designation     TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_user_email_lower ON app_user (LOWER(email));
