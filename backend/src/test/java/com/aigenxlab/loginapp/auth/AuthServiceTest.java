package com.aigenxlab.loginapp.auth;

import com.aigenxlab.loginapp.auth.dto.ChangePasswordRequest;
import com.aigenxlab.loginapp.auth.dto.LoginRequest;
import com.aigenxlab.loginapp.auth.dto.SignupRequest;
import com.aigenxlab.loginapp.auth.dto.UserResponse;
import com.aigenxlab.loginapp.config.AuthProperties;
import com.aigenxlab.loginapp.error.AppException;
import com.aigenxlab.loginapp.session.AppSession;
import com.aigenxlab.loginapp.session.SessionRepository;
import com.aigenxlab.loginapp.user.User;
import com.aigenxlab.loginapp.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository users;
    @Mock SessionRepository sessions;
    @Mock PasswordService passwordService;

    AuthService service;

    @BeforeEach
    void setUp() {
        AuthProperties props = new AuthProperties();
        props.getLockout().setMaxFailedAttempts(3);
        props.getLockout().setLockoutMinutes(15);
        props.getSession().setIdleTimeoutMinutes(30);
        service = new AuthService(users, sessions, passwordService, props);
    }

    // ── login ────────────────────────────────────────────────────────────────

    @Test
    void login_success() {
        User user = makeUser("ada@example.com", "hash", 0, null);
        AppSession session = makeSession(user.getId(), "tok-123");

        when(users.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        when(passwordService.verify("secret", "hash")).thenReturn(true);
        when(sessions.create(eq(user.getId()), anyString(), any(), any())).thenReturn(session);

        AuthService.LoginResult result = service.login(
                new LoginRequest("ada@example.com", "secret"), "127.0.0.1", "TestAgent");

        assertThat(result.user().email()).isEqualTo("ada@example.com");
        assertThat(result.sessionToken()).isEqualTo("tok-123");
        verify(users).resetFailedAttempts(user.getId());
    }

    @Test
    void login_wrongPassword_incrementsCounter() {
        User user = makeUser("ada@example.com", "hash", 0, null);

        when(users.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        when(passwordService.verify("wrong", "hash")).thenReturn(false);

        assertThatThrownBy(() ->
                service.login(new LoginRequest("ada@example.com", "wrong"), null, null))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getCode())
                .isEqualTo("INVALID_CREDENTIALS");

        verify(users).incrementFailedAttempts(eq(user.getId()), any());
        verify(users, never()).resetFailedAttempts(any());
    }

    @Test
    void login_unknownEmail_throws401() {
        when(users.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                service.login(new LoginRequest("nobody@example.com", "pass"), null, null))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getHttpStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void login_lockedAccount_throws403() {
        User locked = makeUser("ada@example.com", "hash", 5,
                OffsetDateTime.now().plusMinutes(10));

        when(users.findByEmail("ada@example.com")).thenReturn(Optional.of(locked));

        assertThatThrownBy(() ->
                service.login(new LoginRequest("ada@example.com", "secret"), null, null))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getCode())
                .isEqualTo("ACCOUNT_LOCKED");
    }

    @Test
    void login_maxFailedAttempts_setsLockUntil() {
        User user = makeUser("ada@example.com", "hash", 2, null); // 2 previous failures

        when(users.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        when(passwordService.verify("wrong", "hash")).thenReturn(false);

        assertThatThrownBy(() ->
                service.login(new LoginRequest("ada@example.com", "wrong"), null, null));

        // 3rd failure (max=3) → lockUntil should be set (non-null)
        verify(users).incrementFailedAttempts(eq(user.getId()), any(OffsetDateTime.class));
    }

    // ── signup ───────────────────────────────────────────────────────────────

    @Test
    void signup_success() {
        when(users.existsByEmail("grace@example.com")).thenReturn(false);
        when(users.existsAny()).thenReturn(false); // first user → auto-activated
        when(passwordService.hash("secret12")).thenReturn("hashed");
        User created = makeUser("grace@example.com", "hashed", 0, null);
        when(users.insert(anyString(), eq("grace@example.com"), eq("hashed"), anyString(), anyString(), anyString(), eq(true)))
                .thenReturn(created);

        UserResponse result = service.signup(new SignupRequest(
                "Grace", "grace@example.com", "secret12", "secret12", "Addr", "Eng", "GENERAL"));

        assertThat(result.email()).isEqualTo("grace@example.com");
    }

    @Test
    void signup_duplicateEmail_throws409() {
        when(users.existsByEmail("ada@example.com")).thenReturn(true);

        assertThatThrownBy(() -> service.signup(new SignupRequest(
                "Ada", "ada@example.com", "secret12", "secret12", "Addr", "Eng", "GENERAL")))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getCode())
                .isEqualTo("EMAIL_ALREADY_EXISTS");
    }

    @Test
    void signup_passwordMismatch_throws422() {
        assertThatThrownBy(() -> service.signup(new SignupRequest(
                "Ada", "ada@example.com", "secret12", "different", "Addr", "Eng", "GENERAL")))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getCode())
                .isEqualTo("PASSWORD_MISMATCH");
    }

    // ── changePassword ───────────────────────────────────────────────────────

    @Test
    void changePassword_success_revokesAllSessions() {
        User user = makeUser("ada@example.com", "oldhash", 0, null);

        when(users.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        when(passwordService.verify("oldpass", "oldhash")).thenReturn(true);
        when(passwordService.hash("newpass12")).thenReturn("newhash");

        service.changePassword(new ChangePasswordRequest(
                "ada@example.com", "oldpass", "newpass12", "newpass12"));

        verify(users).updatePassword(user.getId(), "newhash");
        verify(sessions).revokeAllByUserId(user.getId());
    }

    @Test
    void changePassword_wrongOldPassword_throws422() {
        User user = makeUser("ada@example.com", "oldhash", 0, null);

        when(users.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        when(passwordService.verify("wrong", "oldhash")).thenReturn(false);

        assertThatThrownBy(() -> service.changePassword(new ChangePasswordRequest(
                "ada@example.com", "wrong", "newpass12", "newpass12")))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getCode())
                .isEqualTo("OLD_PASSWORD_INVALID");

        verify(sessions, never()).revokeAllByUserId(any());
    }

    @Test
    void changePassword_newPasswordMismatch_throws422() {
        assertThatThrownBy(() -> service.changePassword(new ChangePasswordRequest(
                "ada@example.com", "old", "newpass12", "different")))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getCode())
                .isEqualTo("PASSWORD_MISMATCH");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static User makeUser(String email, String hash, int failedAttempts,
                                  OffsetDateTime lockedUntil) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setName("Test User");
        u.setEmail(email);
        u.setPasswordHash(hash);
        u.setAddress("Addr");
        u.setDesignation("Eng");
        u.setRole("GENERAL");
        u.setActive(true);   // active by default so login tests pass
        u.setFailedLoginAttempts(failedAttempts);
        u.setLockedUntil(lockedUntil);
        u.setCreatedAt(OffsetDateTime.now());
        u.setUpdatedAt(OffsetDateTime.now());
        return u;
    }

    private static AppSession makeSession(UUID userId, String token) {
        AppSession s = new AppSession();
        s.setId(UUID.randomUUID());
        s.setUserId(userId);
        s.setSessionToken(token);
        s.setCreatedAt(OffsetDateTime.now());
        s.setLastSeenAt(OffsetDateTime.now());
        return s;
    }
}
