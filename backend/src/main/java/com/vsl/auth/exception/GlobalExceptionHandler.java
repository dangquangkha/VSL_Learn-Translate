package com.vsl.auth.exception;

import com.vsl.common.api.ApiErrorResponse;
import com.vsl.common.api.ApiException;
import com.vsl.common.api.CorrelationIds;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiErrorResponse> handleApi(ApiException exception, HttpServletRequest request) {
        return response(exception.status(), exception.code(), exception.getMessage(),
                exception.details(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException exception, HttpServletRequest request) {
        Map<String, Object> details = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error ->
                details.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return response(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Request validation failed", details, request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleOversizedUpload(
            MaxUploadSizeExceededException exception, HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, "INVALID_MODEL_ARTIFACT",
                "The uploaded model must not exceed 5 MiB", Map.of(), request);
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingPart(
            MissingServletRequestPartException exception, HttpServletRequest request) {
        boolean modelPart = "model".equals(exception.getRequestPartName());
        return response(HttpStatus.BAD_REQUEST,
                modelPart ? "INVALID_MODEL_ARTIFACT" : "INVALID_MODEL_METADATA",
                "Required multipart part is missing",
                Map.of("part", exception.getRequestPartName()), request);
    }

    @ExceptionHandler({MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiErrorResponse> handleMalformedRequest(Exception exception,
                                                                   HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "The request is invalid", Map.of(), request);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(IllegalStateException exception,
                                                            HttpServletRequest request) {
        if ("EMAIL_ALREADY_EXISTS".equals(exception.getMessage())) {
            return response(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS",
                    "Email address is already registered", Map.of(), request);
        }
        return response(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "The request is invalid", Map.of(), request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleBadRequest(IllegalArgumentException exception,
                                                              HttpServletRequest request) {
        if ("INVALID_CREDENTIALS".equals(exception.getMessage())) {
            return response(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                    "Invalid email or password", Map.of(), request);
        }
        if ("INVALID_PASSWORD_LENGTH".equals(exception.getMessage())) {
            return response(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD_LENGTH",
                    "Password must be at least 8 characters long", Map.of(), request);
        }
        return response(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "The request is invalid", Map.of(), request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception exception, HttpServletRequest request) {
        String correlationId = CorrelationIds.from(request);
        LOGGER.error("Unhandled API failure correlationId={} type={}",
                correlationId, exception.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ApiErrorResponse(
                "INTERNAL_ERROR", "An unexpected server error occurred", correlationId, Map.of()));
    }

    private static ResponseEntity<ApiErrorResponse> response(
            HttpStatus status, String code, String message, Map<String, Object> details,
            HttpServletRequest request) {
        return ResponseEntity.status(status).body(new ApiErrorResponse(
                code, message, CorrelationIds.from(request), details));
    }
}
