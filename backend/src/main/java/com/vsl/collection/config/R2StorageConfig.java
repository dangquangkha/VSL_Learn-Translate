package com.vsl.collection.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

// EARS[FR-001]: R2 S3Presigner Configuration Bean
@Configuration
public class R2StorageConfig {

    @Value("${r2.endpoint}")
    private String r2Endpoint;

    @Value("${r2.access-key}")
    private String r2AccessKey;

    @Value("${r2.secret-key}")
    private String r2SecretKey;

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                .endpointOverride(URI.create(r2Endpoint))
                .region(Region.US_EAST_1)
                .credentialsProvider(credentialsProvider())
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
                .endpointOverride(URI.create(r2Endpoint))
                .region(Region.US_EAST_1)
                .credentialsProvider(credentialsProvider())
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .build();
    }

    private StaticCredentialsProvider credentialsProvider() {
        return StaticCredentialsProvider.create(AwsBasicCredentials.create(r2AccessKey, r2SecretKey));
    }
}
