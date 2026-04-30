-- Initial schema for the Login App.
-- Targets Supabase Postgres (pgcrypto is preinstalled there for gen_random_uuid()).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE app_user (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,
    email           TEXT        NOT NULL UNIQUE,
    password_hash   TEXT        NOT NULL,
    address         TEXT        NOT NULL,
    designation     TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_user_email_lower ON app_user (LOWER(email));
