package com.aigenxlab.loginapp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS configuration for the {@code local} Spring profile only.
 *
 * In dev mode the Vite dev server runs on :5173 and needs to reach the Spring
 * Boot API on :8085.  In production both are served from the same origin
 * (single JAR), so no CORS headers are needed there.
 */
@Configuration
@Profile("local")
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)   // required for the session cookie
                .maxAge(3600);
    }
}
