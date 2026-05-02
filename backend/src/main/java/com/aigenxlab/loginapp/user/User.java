package com.aigenxlab.loginapp.user;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Domain model — plain Java, no JPA. Mapped from app_users via JDBC RowMapper. */
public class User {

    private UUID id;
    private String name;
    private String email;
    private String passwordHash;
    private String address;
    private String designation;
    private Integer employeeId;
    private String role;
    private boolean active;
    private OffsetDateTime passwordUpdatedAt;
    private int failedLoginAttempts;
    private OffsetDateTime lockedUntil;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public User() {}

    // ── Getters ───────────────────────────────────────────────────────────────

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getAddress() { return address; }
    public String getDesignation() { return designation; }
    public Integer getEmployeeId() { return employeeId; }
    public String getRole() { return role; }
    public boolean isActive() { return active; }
    public OffsetDateTime getPasswordUpdatedAt() { return passwordUpdatedAt; }
    public int getFailedLoginAttempts() { return failedLoginAttempts; }
    public OffsetDateTime getLockedUntil() { return lockedUntil; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }

    // ── Setters (used by RowMapper) ───────────────────────────────────────────

    public void setId(UUID id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setEmail(String email) { this.email = email; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setAddress(String address) { this.address = address; }
    public void setDesignation(String designation) { this.designation = designation; }
    public void setEmployeeId(Integer employeeId) { this.employeeId = employeeId; }
    public void setRole(String role) { this.role = role; }
    public void setActive(boolean active) { this.active = active; }
    public void setPasswordUpdatedAt(OffsetDateTime passwordUpdatedAt) { this.passwordUpdatedAt = passwordUpdatedAt; }
    public void setFailedLoginAttempts(int failedLoginAttempts) { this.failedLoginAttempts = failedLoginAttempts; }
    public void setLockedUntil(OffsetDateTime lockedUntil) { this.lockedUntil = lockedUntil; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    // ── Domain helpers ────────────────────────────────────────────────────────

    public boolean isLocked() {
        return lockedUntil != null && OffsetDateTime.now().isBefore(lockedUntil);
    }
}
