package com.vsl.collection.service;

import java.util.UUID;

// EARS[FR-003]: R2 Object Key Formatter
public class R2KeyFormatter {

    public static String formatUploadKey(String participantCode, String target, String clipId) {
        String id = (clipId != null && !clipId.isBlank()) ? clipId : UUID.randomUUID().toString();
        if ("LANDMARK".equalsIgnoreCase(target)) {
            return String.format("landmarks/%s/%s.bin", participantCode, id);
        }
        return String.format("clips/%s/%s.webm", participantCode, id);
    }

    public static String formatReferenceSignKey(Long signId) {
        return String.format("reference/signs/sign_%d.mp4", signId);
    }

    public static String formatReferencePhraseKey(Long phraseId) {
        return String.format("reference/phrases/phrase_%d.mp4", phraseId);
    }
}
