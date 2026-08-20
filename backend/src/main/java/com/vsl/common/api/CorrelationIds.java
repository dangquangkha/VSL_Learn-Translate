package com.vsl.common.api;

import jakarta.servlet.http.HttpServletRequest;

import java.util.UUID;

public final class CorrelationIds {

    public static final String ATTRIBUTE = CorrelationIds.class.getName() + ".value";

    private CorrelationIds() {
    }

    public static String from(HttpServletRequest request) {
        Object value = request.getAttribute(ATTRIBUTE);
        return value instanceof String id ? id : UUID.randomUUID().toString();
    }
}
