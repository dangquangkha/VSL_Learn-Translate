package com.vsl.auth.exception;

import com.vsl.auth.dto.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// EARS[FR-007, FR-008, FR-011, NFR-003]: Global Exception Handler for Security & Auth Errors
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleConflict(IllegalStateException ex) {
        if ("EMAIL_ALREADY_EXISTS".equals(ex.getMessage())) {
            ErrorResponse error = new ErrorResponse(
                    HttpStatus.CONFLICT.value(),
                    "Conflict",
                    "EMAIL_ALREADY_EXISTS",
                    "Email address is already registered"
            );
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(400, "Bad Request", "BAD_REQUEST", ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleBadRequestOrAuth(IllegalArgumentException ex) {
        if ("INVALID_CREDENTIALS".equals(ex.getMessage())) {
            ErrorResponse error = new ErrorResponse(
                    HttpStatus.UNAUTHORIZED.value(),
                    "Unauthorized",
                    "INVALID_CREDENTIALS",
                    "Invalid email or password"
            );
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }

        if ("INVALID_PASSWORD_LENGTH".equals(ex.getMessage())) {
            ErrorResponse error = new ErrorResponse(
                    HttpStatus.BAD_REQUEST.value(),
                    "Bad Request",
                    "INVALID_PASSWORD_LENGTH",
                    "Password must be at least 8 characters long"
            );
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(400, "Bad Request", "BAD_REQUEST", ex.getMessage()));
    }

    // EARS[FR-009, NFR-002]: Sanitize S3/R2 Storage exceptions without logging secret keys
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericStorageException(Exception ex) {
        // Log generic error message without exposing R2 secret keys
        System.err.println("Storage / Internal Error: " + ex.getClass().getName() + " - " + ex.getMessage());
        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Internal Server Error",
                "STORAGE_ERROR",
                "An unexpected storage or server error occurred."
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
