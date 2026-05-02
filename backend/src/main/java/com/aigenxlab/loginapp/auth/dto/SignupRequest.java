package com.aigenxlab.loginapp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 8, max = 200) String password,
        @NotBlank String confirmPassword,
        @NotBlank @Size(max = 500) String address,
        @NotBlank @Size(max = 120) String designation,
        @NotBlank @Pattern(regexp = "ADMIN|GENERAL") String role
) {
}
