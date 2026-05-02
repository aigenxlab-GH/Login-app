package com.aigenxlab.loginapp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Email is required.")
        @Email(message = "Please enter a valid email address (e.g. name@example.com).")
        String email,

        @NotBlank(message = "Password is required.")
        String password
) {
}
