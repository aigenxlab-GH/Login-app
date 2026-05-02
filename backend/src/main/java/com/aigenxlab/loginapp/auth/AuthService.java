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
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository users;
    private final SessionRepository sessions;
    private final PasswordService passwordService;
    private final AuthProperties props;

    public AuthService(UserRepository users,
                       SessionRepository sessions,
                       PasswordService passwordService,
                       AuthProperties props) {
        this.users = users;
        this.sessions = sessions;
        this.passwordService = passwordService;
        this.props = props;
    }

    public record LoginResult(UserResponse user, String sessionToken) {}

    public LoginResult login(LoginRequest req, String ipAddress, String userAgent) {
        User user = users.findByEmail(req.email().trim().toLowerCase())
                .orElseThrow(AppException::invalidCredentials);

        if (!user.isActive()) {
            throw AppException.accountNotActivated();
        }

        if (user.isLocked()) {
            throw AppException.accountLocked();
        }

        if (!passwordService.verify(req.password(), user.getPasswordHash())) {
            int newCount = user.getFailedLoginAttempts() + 1;
            int max = props.getLockout().getMaxFailedAttempts();
            if (newCount >= max) {
                OffsetDateTime lockUntil = OffsetDateTime.now()
                        .plusMinutes(props.getLockout().getLockoutMinutes());
                users.incrementFailedAttempts(user.getId(), lockUntil);
            } else {
                users.incrementFailedAttempts(user.getId(), null);
            }
            throw AppException.invalidCredentials();
        }

        users.resetFailedAttempts(user.getId());

        String token = UUID.randomUUID().toString();
        AppSession session = sessions.create(user.getId(), token, ipAddress, userAgent);

        return new LoginResult(UserResponse.from(user), session.getSessionToken());
    }

    public UserResponse signup(SignupRequest req) {
        if (!req.password().equals(req.confirmPassword())) {
            throw AppException.passwordMismatch();
        }
        if (users.existsByEmail(req.email().trim().toLowerCase())) {
            throw AppException.emailAlreadyExists();
        }
        // First user ever created is auto-activated regardless of role.
        boolean isFirstUser = !users.existsAny();

        String hash = passwordService.hash(req.password());
        User user = users.insert(
                req.name().trim(),
                req.email().trim().toLowerCase(),
                hash,
                req.address().trim(),
                req.designation().trim(),
                req.role(),
                isFirstUser
        );

        // Auto-assign employee ID for the first user (who is auto-activated).
        if (isFirstUser) {
            int empId = users.getNextEmployeeId();
            if (empId != -1) {
                users.assignEmployeeId(user.getId(), empId);
            }
            // Reload to pick up the assigned employee_id.
            user = users.findById(user.getId()).orElse(user);
        }

        return UserResponse.from(user);
    }

    public void changePassword(ChangePasswordRequest req) {
        if (!req.newPassword().equals(req.confirmNewPassword())) {
            throw AppException.passwordMismatch();
        }
        User user = users.findByEmail(req.email().trim().toLowerCase())
                .orElseThrow(AppException::invalidCredentials);

        if (!passwordService.verify(req.oldPassword(), user.getPasswordHash())) {
            throw AppException.oldPasswordInvalid();
        }

        String newHash = passwordService.hash(req.newPassword());
        users.updatePassword(user.getId(), newHash);
        sessions.revokeAllByUserId(user.getId());
    }

    public UserResponse getMe(UUID userId) {
        return users.findById(userId)
                .map(UserResponse::from)
                .orElseThrow(AppException::invalidCredentials);
    }
}
