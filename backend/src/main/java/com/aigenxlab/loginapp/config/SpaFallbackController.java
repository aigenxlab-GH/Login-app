package com.aigenxlab.loginapp.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards known React Router client-side routes to {@code /index.html} so
 * that hard-refreshing a deep-link (e.g. {@code /home}) works when the app is
 * served from the single-JAR.
 *
 * Why explicit paths instead of a catch-all regex?
 *   The common pattern {@code /{path:[^\\.]*}} matches any single path segment
 *   without a dot, which also captures {@code /swagger-ui} before springdoc's
 *   {@code SimpleUrlHandlerMapping} redirect can run (Spring MVC's
 *   {@code RequestMappingHandlerMapping} has higher priority). Listing routes
 *   explicitly is safer and makes the intent clear.
 *
 * Root {@code /} is intentionally absent: Spring Boot's
 * {@code WelcomePageHandlerMapping} already serves {@code static/index.html}
 * for the root URL with higher specificity than any controller.
 *
 * When adding a new page, add its path here (see CLAUDE.md § Adding New Pages).
 */
@Controller
public class SpaFallbackController {

    @GetMapping({"/home", "/signup", "/change-password"})
    public String forward() {
        return "forward:/index.html";
    }
}
