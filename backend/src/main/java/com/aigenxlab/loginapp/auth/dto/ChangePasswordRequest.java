package com.aigenxlab.loginapp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank @Email String email,
        @NotBlank String oldPassword,
        @NotBlank @Size(min = 8, max = 200) String newPassword,
        @NotBlank String confirmNewPassword
) {
}
