package com.aigenxlab.loginapp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class SpaForwardingConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Forward top-level client-side routes (e.g. /home, /signup, /change-password)
        // to index.html so React Router can render them on direct navigation/refresh.
        // The pattern [^.]* excludes any path with a dot (static assets keep routing
        // to the static handler), and /api/** is matched first by REST controllers.
        registry.addViewController("/{path:[^.]*}").setViewName("forward:/index.html");
    }
}
