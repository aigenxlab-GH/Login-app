package com.aigenxlab.loginapp.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.Map;
import java.util.logging.Logger;

/**
 * Ensures DATABASE_URL always starts with "jdbc:" before Spring resolves
 * the datasource URL.
 *
 * Railway and some other PaaS platforms supply Postgres URLs in the
 * libpq/URI format: {@code postgresql://host:port/db?sslmode=require}
 * Spring Boot (via HikariCP) needs the JDBC form:
 * {@code jdbc:postgresql://host:port/db?sslmode=require}
 *
 * This post-processor runs very early in the startup sequence — before
 * Flyway or HikariCP ever touch the URL — so setting the Railway env var
 * to either format works correctly without any manual editing.
 */
public class JdbcUrlNormalizer implements EnvironmentPostProcessor {

    private static final Logger log = Logger.getLogger(JdbcUrlNormalizer.class.getName());

    private static final String DB_URL_KEY = "DATABASE_URL";
    private static final String JDBC_PREFIX = "jdbc:";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment,
                                       SpringApplication application) {

        String raw = environment.getProperty(DB_URL_KEY);
        if (raw == null || raw.isBlank() || raw.startsWith(JDBC_PREFIX)) {
            return; // nothing to fix
        }

        String normalized = JDBC_PREFIX + raw;
        log.info("[JdbcUrlNormalizer] DATABASE_URL was missing 'jdbc:' prefix — normalized automatically.");

        // Inject a high-priority property source so our value wins over the
        // raw env var without altering the OS environment.
        environment.getPropertySources().addFirst(
                new MapPropertySource("jdbcUrlNormalizerSource",
                        Map.of(DB_URL_KEY, normalized))
        );
    }
}
