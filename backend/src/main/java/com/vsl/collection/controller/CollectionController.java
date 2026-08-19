package com.vsl.collection.controller;

import com.vsl.collection.dto.*;
import com.vsl.collection.service.CollectionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// EARS[FR-C01, FR-C02, FR-C03, FR-C04]: REST endpoints for participant, session, clip management
@RestController
@RequestMapping("/api/collection")
public class CollectionController {

    private final CollectionService collectionService;

    public CollectionController(CollectionService collectionService) {
        this.collectionService = collectionService;
    }

    // FR-C01: Register anonymous participant + record consent
    @PostMapping("/participants")
    public ResponseEntity<ParticipantResponse> registerParticipant(
            @RequestBody ParticipantCreateRequest request) {
        ParticipantResponse response = collectionService.registerParticipant(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // FR-C01: Get participant by code (for session resumption)
    @GetMapping("/participants/{code}")
    public ResponseEntity<ParticipantResponse> getParticipant(@PathVariable String code) {
        return ResponseEntity.ok(collectionService.getParticipantByCode(code));
    }

    // FR-C03: Start a recording session
    @PostMapping("/sessions")
    public ResponseEntity<SessionResponse> startSession(@RequestBody SessionStartRequest request) {
        SessionResponse response = collectionService.startSession(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // FR-C03: Complete a recording session
    @PatchMapping("/sessions/{sessionCode}/complete")
    public ResponseEntity<SessionResponse> completeSession(@PathVariable String sessionCode) {
        return ResponseEntity.ok(collectionService.completeSession(sessionCode));
    }

    // FR-C03: Get clips by session
    @GetMapping("/sessions/{sessionCode}/clips")
    public ResponseEntity<List<ClipResponse>> getClipsBySession(@PathVariable String sessionCode) {
        return ResponseEntity.ok(collectionService.getClipsBySession(sessionCode));
    }

    // FR-C04: Register clip metadata after direct R2 upload succeeds
    @PostMapping("/clips")
    public ResponseEntity<ClipResponse> registerClip(@RequestBody ClipMetadataRequest request) {
        ClipResponse response = collectionService.recordClipMetadata(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // FR-C04: Get all clips by participant
    @GetMapping("/participants/{code}/clips")
    public ResponseEntity<List<ClipResponse>> getClipsByParticipant(@PathVariable String code) {
        return ResponseEntity.ok(collectionService.getClipsByParticipant(code));
    }
}
