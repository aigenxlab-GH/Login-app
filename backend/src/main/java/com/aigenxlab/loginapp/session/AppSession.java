package com.aigenxlab.loginapp.session;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Domain model for a row in app_sessions. Plain Java, no JPA. */
public class AppSession {

    private UUID id;
    private UUID userId;
    private String sessionToken;
    private OffsetDateTime createdAt;
    private OffsetDateTime lastSeenAt;
    private OffsetDateTime revokedAt;
    private String ipAddress;
    private String userAgent;

    public AppSession() {}

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getSessionToken() { return sessionToken; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getLastSeenAt() { return lastSeenAt; }
    public OffsetDateTime getRevokedAt() { return revokedAt; }
    public String getIpAddress() { return ipAddress; }
    public String getUserAgent() { return userAgent; }

    public void setId(UUID id) { this.id = id; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public void setSessionToken(String sessionToken) { this.sessionToken = sessionToken; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public void setLastSeenAt(OffsetDateTime lastSeenAt) { this.lastSeenAt = lastSeenAt; }
    public void setRevokedAt(OffsetDateTime revokedAt) { this.revokedAt = revokedAt; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public boolean isRevoked() { return revokedAt != null; }
}
