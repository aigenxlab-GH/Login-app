package com.aigenxlab.loginapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Typed wrapper around the {@code auth.*} configuration block. */
@Component
@ConfigurationProperties(prefix = "auth")
public class AuthProperties {

    private final Session session = new Session();
    private final Password password = new Password();
    private final Lockout lockout = new Lockout();

    public Session getSession() { return session; }
    public Password getPassword() { return password; }
    public Lockout getLockout() { return lockout; }

    public static class Session {
        private String cookieName = "SESSION";
        private int idleTimeoutMinutes = 5;

        public String getCookieName() { return cookieName; }
        public void setCookieName(String cookieName) { this.cookieName = cookieName; }

        public int getIdleTimeoutMinutes() { return idleTimeoutMinutes; }
        public void setIdleTimeoutMinutes(int idleTimeoutMinutes) { this.idleTimeoutMinutes = idleTimeoutMinutes; }
    }

    public static class Password {
        private String pepper;

        public String getPepper() { return pepper; }
        public void setPepper(String pepper) { this.pepper = pepper; }
    }

    public static class Lockout {
        private int maxFailedAttempts = 5;
        private int lockoutMinutes = 15;

        public int getMaxFailedAttempts() { return maxFailedAttempts; }
        public void setMaxFailedAttempts(int maxFailedAttempts) { this.maxFailedAttempts = maxFailedAttempts; }

        public int getLockoutMinutes() { return lockoutMinutes; }
        public void setLockoutMinutes(int lockoutMinutes) { this.lockoutMinutes = lockoutMinutes; }
    }
}
