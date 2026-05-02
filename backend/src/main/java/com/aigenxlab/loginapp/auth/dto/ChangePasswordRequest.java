package com.aigenxlab.loginapp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Email is required.")
        @Email(message = "Please enter a valid email address (e.g. name@example.com).")
        String email,

        @NotBlank(message = "Current password is required.")
        String oldPassword,

        @NotBlank(message = "New password is required.")
        @Size(min = 8, max = 200, message = "New password must be between 8 and 200 characters.")
        String newPassword,

        @NotBlank(message = "Please confirm your new password.")
        String confirmNewPassword
) {
}
