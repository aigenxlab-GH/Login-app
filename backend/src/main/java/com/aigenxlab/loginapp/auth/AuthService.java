package com.aigenxlab.loginapp.auth;

import com.aigenxlab.loginapp.auth.dto.ChangePasswordRequest;
import com.aigenxlab.loginapp.auth.dto.SignupRequest;
import com.aigenxlab.loginapp.user.User;
import com.aigenxlab.loginapp.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public AuthService(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Transactional
    public User signup(SignupRequest req) {
        if (!req.password().equals(req.confirmPassword())) {
            throw new ValidationException("confirmPassword", "Passwords do not match");
        }
        if (users.existsByEmailIgnoreCase(req.email())) {
            throw new ValidationException("email", "An account with this email already exists");
        }
        User u = new User(
                req.name().trim(),
                req.email().trim().toLowerCase(),
                encoder.encode(req.password()),
                req.address().trim(),
                req.designation().trim()
        );
        return users.save(u);
    }

    @Transactional
    public void changePassword(ChangePasswordRequest req) {
        if (!req.newPassword().equals(req.confirmNewPassword())) {
            throw new ValidationException("confirmNewPassword", "Passwords do not match");
        }
        User u = users.findByEmailIgnoreCase(req.email())
                .orElseThrow(() -> new InvalidCredentialsException("Email or old password is incorrect"));
        if (!encoder.matches(req.oldPassword(), u.getPasswordHash())) {
            throw new InvalidCredentialsException("Email or old password is incorrect");
        }
        u.changePassword(encoder.encode(req.newPassword()));
    }

    public static class ValidationException extends RuntimeException {
        private final String field;

        public ValidationException(String field, String message) {
            super(message);
            this.field = field;
        }

        public String field() { return field; }
    }

    public static class InvalidCredentialsException extends RuntimeException {
        public InvalidCredentialsException(String message) {
            super(message);
        }
    }
}
