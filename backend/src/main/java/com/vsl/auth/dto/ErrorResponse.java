package com.vsl.auth.dto;

import java.time.OffsetDateTime;

public class ErrorResponse {
    private int status;
    private String error;
    private String code;
    private String message;
    private OffsetDateTime timestamp;

    public ErrorResponse() {}
    public ErrorResponse(int status, String error, String code, String message) {
        this.status = status;
        this.error = error;
        this.code = code;
        this.message = message;
        this.timestamp = OffsetDateTime.now();
    }

    public int getStatus() { return status; }
    public String getError() { return error; }
    public String getCode() { return code; }
    public String getMessage() { return message; }
    public OffsetDateTime getTimestamp() { return timestamp; }
}
