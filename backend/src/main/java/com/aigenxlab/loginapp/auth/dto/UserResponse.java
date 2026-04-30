package com.aigenxlab.loginapp.auth.dto;

import com.aigenxlab.loginapp.user.User;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String name,
        String email,
        String address,
        String designation
) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getName(), u.getEmail(), u.getAddress(), u.getDesignation());
    }
}
