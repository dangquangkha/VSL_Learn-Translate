package com.vsl.modelregistry.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.time.Duration;
import java.time.Instant;

@Service
public class R2ModelArtifactStorage implements ModelArtifactStorage {

    private final S3Client client;
    private final S3Presigner presigner;
    private final String bucket;

    public R2ModelArtifactStorage(S3Client client, S3Presigner presigner,
                                  @Value("${r2.bucket-name}") String bucket) {
        this.client = client;
        this.presigner = presigner;
        this.bucket = bucket;
    }

    @Override
    public void put(String key, byte[] content, String contentType) {
        client.putObject(PutObjectRequest.builder()
                        .bucket(bucket).key(key).contentType(contentType).build(),
                RequestBody.fromBytes(content));
    }

    @Override
    public void deleteIfExists(String key) {
        client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }

    @Override
    public boolean exists(String key) {
        try {
            client.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build());
            return true;
        } catch (NoSuchKeyException exception) {
            return false;
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                return false;
            }
            throw exception;
        }
    }

    @Override
    public PresignedDownload presignGet(String key, Duration validity) {
        GetObjectRequest objectRequest = GetObjectRequest.builder().bucket(bucket).key(key).build();
        String url = presigner.presignGetObject(GetObjectPresignRequest.builder()
                        .signatureDuration(validity).getObjectRequest(objectRequest).build())
                .url().toString();
        return new PresignedDownload(url, Instant.now().plus(validity));
    }
}
