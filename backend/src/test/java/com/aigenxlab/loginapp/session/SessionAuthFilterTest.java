package com.aigenxlab.loginapp.session;

import com.aigenxlab.loginapp.auth.SessionAuthFilter;
import com.aigenxlab.loginapp.config.AuthProperties;
import com.aigenxlab.loginapp.error.ApiErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SessionAuthFilterTest {

    @Mock SessionRepository sessionRepo;
    @Mock FilterChain chain;

    SessionAuthFilter filter;
    ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        AuthProperties props = new AuthProperties();
        props.getSession().setCookieName("SESSION");
        props.getSession().setIdleTimeoutMinutes(30);
        filter = new SessionAuthFilter(sessionRepo, props, mapper);
    }

    @Test
    void noCookie_continuesChain() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest();
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        verify(chain).doFilter(req, res);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void validSession_populatesSecurityContext() throws Exception {
        UUID userId = UUID.randomUUID();
        AppSession session = activeSession(userId, "valid-token", 0);

        when(sessionRepo.findByToken("valid-token")).thenReturn(Optional.of(session));

        MockHttpServletRequest req = requestWithCookie("valid-token");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        verify(chain).doFilter(req, res);
        verify(sessionRepo).updateLastSeen("valid-token");
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal())
                .isEqualTo(userId);
        assertThat(res.getStatus()).isEqualTo(200);
    }

    @Test
    void revokedSession_returns401() throws Exception {
        UUID userId = UUID.randomUUID();
        AppSession session = activeSession(userId, "revoked-token", 0);
        session.setRevokedAt(OffsetDateTime.now().minusMinutes(1));

        when(sessionRepo.findByToken("revoked-token")).thenReturn(Optional.of(session));

        MockHttpServletRequest req = requestWithCookie("revoked-token");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        verify(chain, never()).doFilter(req, res);
        assertThat(res.getStatus()).isEqualTo(401);
        ApiErrorResponse body = mapper.readValue(res.getContentAsString(), ApiErrorResponse.class);
        assertThat(body.code()).isEqualTo("SESSION_TIMED_OUT");
    }

    @Test
    void sessionNotFound_returns401() throws Exception {
        when(sessionRepo.findByToken("ghost-token")).thenReturn(Optional.empty());

        MockHttpServletRequest req = requestWithCookie("ghost-token");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        verify(chain, never()).doFilter(req, res);
        assertThat(res.getStatus()).isEqualTo(401);
    }

    @Test
    void idleSession_revokesAndReturns401() throws Exception {
        UUID userId = UUID.randomUUID();
        // last seen 60 minutes ago, idle timeout is 30 min
        AppSession session = activeSession(userId, "idle-token", 60);

        when(sessionRepo.findByToken("idle-token")).thenReturn(Optional.of(session));

        MockHttpServletRequest req = requestWithCookie("idle-token");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, chain);

        verify(chain, never()).doFilter(req, res);
        verify(sessionRepo).revokeByToken("idle-token");
        assertThat(res.getStatus()).isEqualTo(401);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static AppSession activeSession(UUID userId, String token, int idleMinutesAgo) {
        AppSession s = new AppSession();
        s.setId(UUID.randomUUID());
        s.setUserId(userId);
        s.setSessionToken(token);
        s.setCreatedAt(OffsetDateTime.now().minusMinutes(idleMinutesAgo));
        s.setLastSeenAt(OffsetDateTime.now().minusMinutes(idleMinutesAgo));
        return s;
    }

    private static MockHttpServletRequest requestWithCookie(String token) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setCookies(new Cookie("SESSION", token));
        return req;
    }
}
