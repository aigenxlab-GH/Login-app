package com.aigenxlab.loginapp.auth;

import com.aigenxlab.loginapp.config.AuthProperties;
import com.aigenxlab.loginapp.error.ApiErrorResponse;
import com.aigenxlab.loginapp.error.AppException;
import com.aigenxlab.loginapp.session.AppSession;
import com.aigenxlab.loginapp.session.SessionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

/**
 * Validates the session cookie on every request.
 *
 * Algorithm:
 *   1. Read session token from the httpOnly cookie.
 *   2. If no cookie present → continue filter chain (Spring Security will
 *      reject unauthenticated access to protected endpoints via 401).
 *   3. If cookie present:
 *      a. Load session row from DB.
 *      b. If not found → 401 SESSION_TIMED_OUT (cookie is stale/forged).
 *      c. If revoked_at is set → 401 SESSION_TIMED_OUT.
 *      d. If idle for > idleTimeoutMinutes → 401 SESSION_TIMED_OUT.
 *      e. Otherwise → update last_seen_at, populate SecurityContextHolder.
 */
@Component
public class SessionAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(SessionAuthFilter.class);

    /** Request attribute key where the session token is stored for downstream use. */
    public static final String ATTR_SESSION_TOKEN = "SESSION_TOKEN";

    private final SessionRepository sessions;
    private final AuthProperties props;
    private final ObjectMapper objectMapper;

    public SessionAuthFilter(SessionRepository sessions,
                             AuthProperties props,
                             ObjectMapper objectMapper) {
        this.sessions = sessions;
        this.props = props;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String token = extractToken(request);

        if (token == null) {
            // No cookie — let the filter chain continue.
            // Protected endpoints will trigger a 401 via the AuthenticationEntryPoint.
            chain.doFilter(request, response);
            return;
        }

        Optional<AppSession> sessionOpt = sessions.findByToken(token);

        if (sessionOpt.isEmpty() || sessionOpt.get().isRevoked()) {
            rejectWithJson(response, AppException.sessionTimedOut());
            return;
        }

        AppSession session = sessionOpt.get();
        int idleMinutes = props.getSession().getIdleTimeoutMinutes();
        OffsetDateTime idleDeadline = OffsetDateTime.now().minusMinutes(idleMinutes);

        if (session.getLastSeenAt().isBefore(idleDeadline)) {
            // Idle too long — revoke the session and return 401.
            sessions.revokeByToken(token);
            rejectWithJson(response, AppException.sessionTimedOut());
            return;
        }

        // Session is valid — update last_seen_at and set the principal.
        sessions.updateLastSeen(token);

        request.setAttribute(ATTR_SESSION_TOKEN, token);

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                        session.getUserId(), null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);

        log.debug("Session authenticated for userId={} path={}", session.getUserId(),
                request.getRequestURI());

        chain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        String cookieName = props.getSession().getCookieName();
        return Arrays.stream(cookies)
                .filter(c -> cookieName.equals(c.getName()))
                .findFirst()
                .map(Cookie::getValue)
                .orElse(null);
    }

    private void rejectWithJson(HttpServletResponse response, AppException ex)
            throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(ex.getHttpStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(),
                ApiErrorResponse.of(ex.getCode(), ex.getMessage()));
    }
}
