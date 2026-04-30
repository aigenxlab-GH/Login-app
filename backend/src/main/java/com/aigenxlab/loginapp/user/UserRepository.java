package com.aigenxlab.loginapp.user;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
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
public class UserRepository {

    private static final Logger log = LoggerFactory.getLogger(UserRepository.class);

    private final NamedParameterJdbcTemplate jdbc;

    public UserRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ── Reads ─────────────────────────────────────────────────────────────────

    public Optional<User> findByEmail(String email) {
        String sql = "SELECT * FROM app_users WHERE LOWER(email) = LOWER(:email) LIMIT 1";
        List<User> rows = jdbc.query(sql, new MapSqlParameterSource("email", email), USER_MAPPER);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    public Optional<User> findById(UUID id) {
        String sql = "SELECT * FROM app_users WHERE id = :id LIMIT 1";
        List<User> rows = jdbc.query(sql, new MapSqlParameterSource("id", id), USER_MAPPER);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    public boolean existsByEmail(String email) {
        String sql = "SELECT COUNT(*) FROM app_users WHERE LOWER(email) = LOWER(:email)";
        Long count = jdbc.queryForObject(sql, new MapSqlParameterSource("email", email), Long.class);
        return count != null && count > 0;
    }

    // ── Writes ────────────────────────────────────────────────────────────────

    public User insert(String name, String email, String passwordHash,
                       String address, String designation) {
        String sql = """
                INSERT INTO app_users (name, email, password_hash, address, designation)
                VALUES (:name, :email, :passwordHash, :address, :designation)
                RETURNING *
                """;
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("name", name)
                .addValue("email", email.toLowerCase())
                .addValue("passwordHash", passwordHash)
                .addValue("address", address)
                .addValue("designation", designation);
        return jdbc.queryForObject(sql, params, USER_MAPPER);
    }

    public void updatePassword(UUID userId, String newPasswordHash) {
        String sql = """
                UPDATE app_users
                SET password_hash = :hash,
                    password_updated_at = NOW(),
                    failed_login_attempts = 0,
                    locked_until = NULL,
                    updated_at = NOW()
                WHERE id = :id
                """;
        jdbc.update(sql, new MapSqlParameterSource()
                .addValue("hash", newPasswordHash)
                .addValue("id", userId));
    }

    public void incrementFailedAttempts(UUID userId, OffsetDateTime lockUntil) {
        String sql = """
                UPDATE app_users
                SET failed_login_attempts = failed_login_attempts + 1,
                    locked_until = :lockUntil,
                    updated_at = NOW()
                WHERE id = :id
                """;
        jdbc.update(sql, new MapSqlParameterSource()
                .addValue("lockUntil", lockUntil)
                .addValue("id", userId));
    }

    public void resetFailedAttempts(UUID userId) {
        String sql = """
                UPDATE app_users
                SET failed_login_attempts = 0,
                    locked_until = NULL,
                    updated_at = NOW()
                WHERE id = :id
                """;
        jdbc.update(sql, new MapSqlParameterSource("id", userId));
    }

    // ── RowMapper ─────────────────────────────────────────────────────────────

    private static final RowMapper<User> USER_MAPPER = new RowMapper<>() {
        @Override
        public User mapRow(ResultSet rs, int rowNum) throws SQLException {
            User u = new User();
            u.setId(rs.getObject("id", UUID.class));
            u.setName(rs.getString("name"));
            u.setEmail(rs.getString("email"));
            u.setPasswordHash(rs.getString("password_hash"));
            u.setAddress(rs.getString("address"));
            u.setDesignation(rs.getString("designation"));
            u.setFailedLoginAttempts(rs.getInt("failed_login_attempts"));
            u.setPasswordUpdatedAt(toOffsetDateTime(rs.getTimestamp("password_updated_at")));
            u.setLockedUntil(toOffsetDateTime(rs.getTimestamp("locked_until")));
            u.setCreatedAt(toOffsetDateTime(rs.getTimestamp("created_at")));
            u.setUpdatedAt(toOffsetDateTime(rs.getTimestamp("updated_at")));
            return u;
        }

        private OffsetDateTime toOffsetDateTime(Timestamp ts) {
            if (ts == null) return null;
            return ts.toInstant().atOffset(ZoneOffset.UTC);
        }
    };
}
