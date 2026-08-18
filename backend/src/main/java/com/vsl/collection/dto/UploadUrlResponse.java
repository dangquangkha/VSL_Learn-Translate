package com.vsl.collection.dto;

public class UploadUrlResponse {
    private String uploadUrl;
    private String r2Key;
    private long expiresInSeconds;

    public UploadUrlResponse() {}
    public UploadUrlResponse(String uploadUrl, String r2Key, long expiresInSeconds) {
        this.uploadUrl = uploadUrl;
        this.r2Key = r2Key;
        this.expiresInSeconds = expiresInSeconds;
    }

    public String getUploadUrl() { return uploadUrl; }
    public void setUploadUrl(String uploadUrl) { this.uploadUrl = uploadUrl; }

    public String getR2Key() { return r2Key; }
    public void setR2Key(String r2Key) { this.r2Key = r2Key; }

    public long getExpiresInSeconds() { return expiresInSeconds; }
    public void setExpiresInSeconds(long expiresInSeconds) { this.expiresInSeconds = expiresInSeconds; }
}
