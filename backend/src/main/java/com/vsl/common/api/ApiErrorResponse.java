package com.vsl.common.api;

import java.util.Map;

public record ApiErrorResponse(
        String code,
        String message,
        String correlationId,
        Map<String, Object> details
) {
    public ApiErrorResponse {
        details = Map.copyOf(details);
    }
}
