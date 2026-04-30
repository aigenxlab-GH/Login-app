-- H2 schema for unit/integration tests (mirrors Flyway V1-V3 for Postgres)

CREATE TABLE IF NOT EXISTS app_users (
    id                    UUID         PRIMARY KEY DEFAULT RANDOM_UUID(),
    name                  VARCHAR(120) NOT NULL,
    email                 VARCHAR(254) NOT NULL UNIQUE,
    password_hash         TEXT         NOT NULL,
    address               TEXT         NOT NULL,
    designation           VARCHAR(120) NOT NULL,
    password_updated_at   TIMESTAMP WITH TIME ZONE NULL,
    failed_login_attempts INT          NOT NULL DEFAULT 0,
    locked_until          TIMESTAMP WITH TIME ZONE NULL,
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_sessions (
    id            UUID         PRIMARY KEY DEFAULT RANDOM_UUID(),
    user_id       UUID         NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    session_token TEXT         NOT NULL UNIQUE,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at    TIMESTAMP WITH TIME ZONE NULL,
    ip_address    TEXT         NULL,
    user_agent    TEXT         NULL
);
