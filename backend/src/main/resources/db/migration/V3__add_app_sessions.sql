-- ==========================================================================
-- V3__add_app_sessions.sql
--
-- Server-side session store.  Every successful login creates one row.
-- The session token is stored in an httpOnly cookie on the client.
-- The security filter validates the token, checks revoked_at and idle
-- timeout, and updates last_seen_at on each authenticated request.
-- ==========================================================================

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

-- Fast look-up by token (the hot path on every authenticated request).
CREATE INDEX idx_app_sessions_token
    ON app_sessions (session_token);

-- Efficient per-user session revocation (e.g. after password change).
CREATE INDEX idx_app_sessions_user_id
    ON app_sessions (user_id);
