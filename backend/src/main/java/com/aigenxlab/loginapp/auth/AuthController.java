package com.aigenxlab.loginapp.auth;

import com.aigenxlab.loginapp.auth.dto.ChangePasswordRequest;
import com.aigenxlab.loginapp.auth.dto.LoginRequest;
import com.aigenxlab.loginapp.auth.dto.SignupRequest;
import com.aigenxlab.loginapp.auth.dto.UserResponse;
import com.aigenxlab.loginapp.config.AuthProperties;
import com.aigenxlab.loginapp.session.SessionRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final SessionRepository sessions;
    private final AuthProperties props;
    private final boolean cookieSecure;

    public AuthController(AuthService authService,
                          SessionRepository sessions,
                          AuthProperties props,
                          Environment environment) {
        this.authService = authService;
        this.sessions = sessions;
        this.props = props;
        // Secure flag is true unless the "local" profile is active.
        // This ensures cookies are Secure in prod/staging without requiring an env var.
        this.cookieSecure = !environment.acceptsProfiles(Profiles.of("local"));
    }

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(
            @Valid @RequestBody LoginRequest req,
            HttpServletRequest request
    ) {
        String ip = request.getRemoteAddr();
        String ua = request.getHeader("User-Agent");
        AuthService.LoginResult result = authService.login(req, ip, ua);

        ResponseCookie cookie = buildSessionCookie(result.sessionToken());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.user());
    }

    @PostMapping("/signup")
    public ResponseEntity<UserResponse> signup(@Valid @RequestBody SignupRequest req) {
        UserResponse user = authService.signup(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(authService.getMe(userId));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        String token = (String) request.getAttribute(SessionAuthFilter.ATTR_SESSION_TOKEN);
        if (token != null) {
            sessions.revokeByToken(token);
        }
        ResponseCookie expiredCookie = ResponseCookie
                .from(props.getSession().getCookieName(), "")
                .httpOnly(true)
                .sameSite("Lax")
                .secure(cookieSecure)
                .path("/")
                .maxAge(0)
                .build();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, expiredCookie.toString())
                .build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        authService.changePassword(req);
        return ResponseEntity.noContent().build();
    }

    private ResponseCookie buildSessionCookie(String token) {
        return ResponseCookie
                .from(props.getSession().getCookieName(), token)
                .httpOnly(true)
                .sameSite("Lax")
                .secure(cookieSecure)
                .path("/")
                .maxAge(props.getSession().getIdleTimeoutMinutes() * 60L)
                .build();
    }
}
