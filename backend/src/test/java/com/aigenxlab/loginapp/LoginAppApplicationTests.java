package com.aigenxlab.loginapp;

import org.junit.jupiter.api.Test;

/** Smoke test — verifies the test classpath is wired correctly. */
class LoginAppApplicationTests {

    @Test
    void contextLoads() {
        // No Spring context needed — full context load requires a live database.
        // AuthServiceTest and SessionAuthFilterTest cover the application logic.
    }
}
