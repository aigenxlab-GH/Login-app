package com.aigenxlab.loginapp.auth.dto;

import com.aigenxlab.loginapp.user.User;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String employeeId,   // "5001" or null if not yet activated
        String name,
        String email,
        String address,
        String designation,
        String role,
        boolean active
) {
    public static UserResponse from(User u) {
        String empId = u.getEmployeeId() != null ? String.valueOf(u.getEmployeeId()) : null;
        return new UserResponse(
                u.getId(), empId, u.getName(), u.getEmail(),
                u.getAddress(), u.getDesignation(), u.getRole(), u.isActive());
    }
}
