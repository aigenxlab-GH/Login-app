package com.aigenxlab.loginapp.config;

import com.aigenxlab.loginapp.auth.SessionAuthFilter;
import com.aigenxlab.loginapp.error.ApiErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;

/**
 * Spring Security configuration.
 *
 * Auth is handled entirely by {@link SessionAuthFilter}; Spring Security is used
 * only for the filter chain, CSRF handling, and authorization rules.
 *
 * No form login, no HTTP Basic, no Spring-managed session.
 * {@link UserDetailsServiceAutoConfiguration} is excluded in
 * {@link com.aigenxlab.loginapp.LoginAppApplication} to suppress the
 * "auto-generated password" warning.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final SessionAuthFilter sessionAuthFilter;
    private final ObjectMapper objectMapper;

    public SecurityConfig(SessionAuthFilter sessionAuthFilter, ObjectMapper objectMapper) {
        this.sessionAuthFilter = sessionAuthFilter;
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // We manage sessions ourselves via app_sessions table.
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // CSRF is safe to disable: same-origin SPA, JSON-only API,
                // httpOnly+SameSite=Lax cookie, no state-mutating GETs.
                .csrf(csrf -> csrf.disable())

                // Register our session filter before Spring's anonymous filter so
                // that authenticated principals are available during authorization.
                .addFilterBefore(sessionAuthFilter, AnonymousAuthenticationFilter.class)

                .authorizeHttpRequests(auth -> auth
                        // Public auth endpoints
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/signup",
                                "/api/auth/change-password"
                        ).permitAll()
                        // Observability & docs (unauthenticated)
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html",
                                "/v3/api-docs/**").permitAll()
                        // All other /api/** endpoints require an authenticated session
                        .requestMatchers("/api/**").authenticated()
                        // Static SPA assets and HTML
                        .anyRequest().permitAll()
                )

                // Return JSON 401 instead of a redirect or HTML when an
                // unauthenticated request hits a protected /api/** endpoint.
                .exceptionHandling(eh -> eh.authenticationEntryPoint(jsonUnauthorizedEntryPoint()))

                .formLogin(fl -> fl.disable())
                .httpBasic(hb -> hb.disable())
                .logout(lg -> lg.disable());

        return http.build();
    }

    private AuthenticationEntryPoint jsonUnauthorizedEntryPoint() {
        return (request, response, ex) -> {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(),
                    ApiErrorResponse.of("UNAUTHORIZED", "Authentication required."));
        };
    }
}
