package com.aigenxlab.loginapp.error;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

/** Uniform JSON error envelope: {@code { code, message, details? }}. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiErrorResponse(
        String code,
        String message,
        Map<String, String> details
) {
    public static ApiErrorResponse of(String code, String message) {
        return new ApiErrorResponse(code, message, null);
    }

    public static ApiErrorResponse withDetails(String code, String message,
                                               Map<String, String> details) {
        return new ApiErrorResponse(code, message, details);
    }
}
