package com.aigenxlab.loginapp.error;

import com.aigenxlab.loginapp.auth.AuthService;
import com.aigenxlab.loginapp.auth.dto.ApiError;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        return ResponseEntity.badRequest()
                .body(ApiError.ofFields("validation_failed", "One or more fields are invalid", fields));
    }

    @ExceptionHandler(AuthService.ValidationException.class)
    public ResponseEntity<ApiError> handleBusinessValidation(AuthService.ValidationException ex) {
        return ResponseEntity.badRequest()
                .body(ApiError.ofFields("validation_failed", ex.getMessage(), Map.of(ex.field(), ex.getMessage())));
    }

    @ExceptionHandler(AuthService.InvalidCredentialsException.class)
    public ResponseEntity<ApiError> handleInvalidCredentials(AuthService.InvalidCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiError.of("invalid_credentials", ex.getMessage()));
    }
}
