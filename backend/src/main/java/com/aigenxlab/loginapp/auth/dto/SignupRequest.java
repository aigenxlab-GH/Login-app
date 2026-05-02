package com.aigenxlab.loginapp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank(message = "Full name is required.")
        @Size(min = 2, max = 120, message = "Full name must be between 2 and 120 characters.")
        String name,

        @NotBlank(message = "Email is required.")
        @Email(message = "Please enter a valid email address (e.g. name@example.com).")
        @Size(max = 254, message = "Email cannot exceed 254 characters.")
        String email,

        @NotBlank(message = "Password is required.")
        @Size(min = 8, max = 200, message = "Password must be between 8 and 200 characters.")
        String password,

        @NotBlank(message = "Please confirm your password.")
        String confirmPassword,

        @NotBlank(message = "Address is required.")
        @Size(max = 500, message = "Address cannot exceed 500 characters.")
        String address,

        @NotBlank(message = "Designation is required.")
        @Size(min = 2, max = 120, message = "Designation must be between 2 and 120 characters.")
        String designation,

        @NotBlank(message = "User type is required.")
        @Pattern(regexp = "ADMIN|GENERAL", message = "User type must be either ADMIN or GENERAL.")
        String role
) {
}
