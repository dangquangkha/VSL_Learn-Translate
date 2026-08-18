package com.vsl.collection.service;

import com.vsl.collection.dto.UploadUrlRequest;
import com.vsl.collection.dto.UploadUrlResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.UUID;

// EARS[FR-001, FR-002, FR-005, NFR-002]: R2 Storage Service handling Presigned PUT & GET URL generation
@Service
public class R2StorageService {

    private final S3Presigner s3Presigner;

    @Value("${r2.bucket-name:vsl-data}")
    private String bucketName;

    public R2StorageService(S3Presigner s3Presigner) {
        this.s3Presigner = s3Presigner;
    }

    public UploadUrlResponse generatePresignedUploadUrl(UploadUrlRequest request) {
        if (request.getParticipantCode() == null || request.getParticipantCode().isBlank()) {
            throw new IllegalArgumentException("INVALID_PARTICIPANT_CODE");
        }

        String clipId = UUID.randomUUID().toString();
        String r2Key = R2KeyFormatter.formatUploadKey(request.getParticipantCode(), request.getTarget(), clipId);
        String contentType = (request.getFileType() != null && !request.getFileType().isBlank())
                ? request.getFileType()
                : ("LANDMARK".equalsIgnoreCase(request.getTarget()) ? "application/octet-stream" : "video/webm");

        // Bind exact Content-Type header into S3 PutObjectRequest signature (FR-002 Option A)
        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(r2Key)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15)) // Fixed 15-minute expiration (NFR-002)
                .putObjectRequest(objectRequest)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);
        String uploadUrl = presignedRequest.url().toString();

        return new UploadUrlResponse(uploadUrl, r2Key, 900L);
    }

    public String generatePresignedViewUrl(String r2Key) {
        GetObjectRequest objectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(r2Key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .getObjectRequest(objectRequest)
                .build();

        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
        return presignedRequest.url().toString();
    }
}
