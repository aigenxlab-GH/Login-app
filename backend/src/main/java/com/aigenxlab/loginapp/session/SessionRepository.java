package com.aigenxlab.loginapp.session;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class SessionRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public SessionRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ── Writes ────────────────────────────────────────────────────────────────

    public AppSession create(UUID userId, String sessionToken,
                             String ipAddress, String userAgent) {
        String sql = """
                INSERT INTO app_sessions (user_id, session_token, ip_address, user_agent)
                VALUES (:userId, :token, :ip, :ua)
                RETURNING *
                """;
        return jdbc.queryForObject(sql, new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("token", sessionToken)
                .addValue("ip", ipAddress)
                .addValue("ua", userAgent), SESSION_MAPPER);
    }

    public void updateLastSeen(String sessionToken) {
        String sql = "UPDATE app_sessions SET last_seen_at = NOW() WHERE session_token = :token";
        jdbc.update(sql, new MapSqlParameterSource("token", sessionToken));
    }

    public void revokeByToken(String sessionToken) {
        String sql = """
                UPDATE app_sessions SET revoked_at = NOW()
                WHERE session_token = :token AND revoked_at IS NULL
                """;
        jdbc.update(sql, new MapSqlParameterSource("token", sessionToken));
    }

    public void revokeAllByUserId(UUID userId) {
        String sql = """
                UPDATE app_sessions SET revoked_at = NOW()
                WHERE user_id = :userId AND revoked_at IS NULL
                """;
        jdbc.update(sql, new MapSqlParameterSource("userId", userId));
    }

    // ── Reads ─────────────────────────────────────────────────────────────────

    public Optional<AppSession> findByToken(String sessionToken) {
        String sql = "SELECT * FROM app_sessions WHERE session_token = :token LIMIT 1";
        List<AppSession> rows = jdbc.query(sql,
                new MapSqlParameterSource("token", sessionToken), SESSION_MAPPER);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    // ── RowMapper ─────────────────────────────────────────────────────────────

    private static final RowMapper<AppSession> SESSION_MAPPER = new RowMapper<>() {
        @Override
        public AppSession mapRow(ResultSet rs, int rowNum) throws SQLException {
            AppSession s = new AppSession();
            s.setId(rs.getObject("id", UUID.class));
            s.setUserId(rs.getObject("user_id", UUID.class));
            s.setSessionToken(rs.getString("session_token"));
            s.setCreatedAt(toOdt(rs.getTimestamp("created_at")));
            s.setLastSeenAt(toOdt(rs.getTimestamp("last_seen_at")));
            s.setRevokedAt(toOdt(rs.getTimestamp("revoked_at")));
            s.setIpAddress(rs.getString("ip_address"));
            s.setUserAgent(rs.getString("user_agent"));
            return s;
        }

        private OffsetDateTime toOdt(Timestamp ts) {
            if (ts == null) return null;
            return ts.toInstant().atOffset(ZoneOffset.UTC);
        }
    };
}
