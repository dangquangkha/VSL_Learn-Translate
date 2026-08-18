package com.vsl.collection.controller;

import com.vsl.collection.dto.UploadUrlRequest;
import com.vsl.collection.dto.UploadUrlResponse;
import com.vsl.collection.service.R2StorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// EARS[FR-002, FR-005, FR-008]: Collection Upload Controller endpoints
@RestController
public class CollectionUploadController {

    private final R2StorageService r2StorageService;

    public CollectionUploadController(R2StorageService r2StorageService) {
        this.r2StorageService = r2StorageService;
    }

    @PostMapping("/api/collection/clips/upload-url")
    public ResponseEntity<UploadUrlResponse> getUploadUrl(@RequestBody UploadUrlRequest request) {
        UploadUrlResponse response = r2StorageService.generatePresignedUploadUrl(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/admin/clips/{clipId}/view-url")
    public ResponseEntity<Map<String, Object>> getViewUrl(@PathVariable String clipId, @RequestParam(defaultValue = "P01") String participantCode) {
        String r2Key = String.format("clips/%s/%s.webm", participantCode, clipId);
        String viewUrl = r2StorageService.generatePresignedViewUrl(r2Key);
        return ResponseEntity.ok(Map.of("viewUrl", viewUrl, "expiresInSeconds", 900L));
    }
}
