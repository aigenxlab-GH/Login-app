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

    public List<User> findAll() {
        String sql = "SELECT * FROM app_users ORDER BY created_at ASC";
        return jdbc.query(sql, new MapSqlParameterSource(), USER_MAPPER);
    }

    public boolean existsByEmail(String email) {
        String sql = "SELECT COUNT(*) FROM app_users WHERE LOWER(email) = LOWER(:email)";
        Long count = jdbc.queryForObject(sql, new MapSqlParameterSource("email", email), Long.class);
        return count != null && count > 0;
    }

    public boolean existsAny() {
        String sql = "SELECT COUNT(*) FROM app_users";
        Long count = jdbc.queryForObject(sql, new MapSqlParameterSource(), Long.class);
        return count != null && count > 0;
    }

    // ── Writes ────────────────────────────────────────────────────────────────

    public User insert(String name, String email, String passwordHash,
                       String address, String designation, String role, boolean active) {
        String sql = """
                INSERT INTO app_users (name, email, password_hash, address, designation, role, is_active)
                VALUES (:name, :email, :passwordHash, :address, :designation, :role, :active)
                RETURNING *
                """;
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("name", name)
                .addValue("email", email.toLowerCase())
                .addValue("passwordHash", passwordHash)
                .addValue("address", address)
                .addValue("designation", designation)
                .addValue("role", role)
                .addValue("active", active);
        return jdbc.queryForObject(sql, params, USER_MAPPER);
    }

    public void setActiveStatus(UUID userId, boolean active) {
        String sql = "UPDATE app_users SET is_active = :active, updated_at = NOW() WHERE id = :id";
        jdbc.update(sql, new MapSqlParameterSource()
                .addValue("active", active)
                .addValue("id", userId));
    }

    /**
     * Returns the next available employee ID in the range 5001–5999.
     * Returns -1 if all IDs in the range are exhausted.
     */
    public int getNextEmployeeId() {
        String sql = "SELECT COALESCE(MAX(employee_id), 5000) + 1 FROM app_users WHERE employee_id IS NOT NULL";
        Integer next = jdbc.queryForObject(sql, new MapSqlParameterSource(), Integer.class);
        if (next == null || next > 5999) return -1;
        return next;
    }

    public void assignEmployeeId(UUID userId, int employeeId) {
        String sql = "UPDATE app_users SET employee_id = :empId, updated_at = NOW() WHERE id = :id";
        jdbc.update(sql, new MapSqlParameterSource()
                .addValue("empId", employeeId)
                .addValue("id", userId));
    }

    public void deleteById(UUID id) {
        jdbc.update("DELETE FROM app_users WHERE id = :id",
                new MapSqlParameterSource("id", id));
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
            int empId = rs.getInt("employee_id");
            u.setEmployeeId(rs.wasNull() ? null : empId);
            u.setRole(rs.getString("role"));
            u.setActive(rs.getBoolean("is_active"));
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
