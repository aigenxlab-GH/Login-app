package com.aigenxlab.loginapp.auth.dto;

import java.util.Map;

public record ApiError(
        String error,
        String message,
        Map<String, String> fieldErrors
) {
    public static ApiError of(String error, String message) {
        return new ApiError(error, message, Map.of());
    }

    public static ApiError ofFields(String error, String message, Map<String, String> fields) {
        return new ApiError(error, message, fields);
    }
}
