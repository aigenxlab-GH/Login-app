package com.aigenxlab.loginapp.error;

import org.springframework.http.HttpStatus;

/**
 * Domain exception that maps directly to an HTTP error response.
 * All auth-related business-rule violations throw this.
 */
public class AppException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final String code;
    private final HttpStatus httpStatus;

    public AppException(String code, String message, HttpStatus httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    public String getCode() { return code; }
    public HttpStatus getHttpStatus() { return httpStatus; }

    // ── Named factory methods for every error code ────────────────────────────

    public static AppException emailAlreadyExists() {
        return new AppException("EMAIL_ALREADY_EXISTS",
                "An account with this email already exists.", HttpStatus.CONFLICT);
    }

    public static AppException invalidCredentials() {
        return new AppException("INVALID_CREDENTIALS",
                "Email or password is incorrect.", HttpStatus.UNAUTHORIZED);
    }

    public static AppException accountLocked() {
        return new AppException("ACCOUNT_LOCKED",
                "Account is temporarily locked due to too many failed login attempts.",
                HttpStatus.FORBIDDEN);
    }

    public static AppException oldPasswordInvalid() {
        return new AppException("OLD_PASSWORD_INVALID",
                "The old password you entered is incorrect.", HttpStatus.UNPROCESSABLE_ENTITY);
    }

    public static AppException sessionTimedOut() {
        return new AppException("SESSION_TIMED_OUT",
                "Your session has expired. Please log in again.", HttpStatus.UNAUTHORIZED);
    }

    public static AppException passwordMismatch() {
        return new AppException("PASSWORD_MISMATCH",
                "Passwords do not match.", HttpStatus.UNPROCESSABLE_ENTITY);
    }

    public static AppException accountNotActivated() {
        return new AppException("ACCOUNT_NOT_ACTIVATED",
                "Your account is not yet activated. Request Admin to activate your account.",
                HttpStatus.FORBIDDEN);
    }

    public static AppException forbidden() {
        return new AppException("FORBIDDEN",
                "You do not have permission to perform this action.", HttpStatus.FORBIDDEN);
    }

    public static AppException employeeIdExhausted() {
        return new AppException("EMPLOYEE_ID_EXHAUSTED",
                "All employee IDs in the range 5001-5999 have been assigned.",
                HttpStatus.UNPROCESSABLE_ENTITY);
    }

    public static AppException badRequest(String message) {
        return new AppException("BAD_REQUEST", message, HttpStatus.BAD_REQUEST);
    }
}
