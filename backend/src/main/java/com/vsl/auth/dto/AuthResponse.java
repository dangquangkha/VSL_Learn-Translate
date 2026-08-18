package com.vsl.auth.dto;

import com.vsl.auth.entity.Role;

public class AuthResponse {
    private String token;
    private String type = "Bearer";
    private Long userId;
    private String email;
    private Role role;
    private long expiresIn = 86400; // 24 hours in seconds

    public AuthResponse() {}
    public AuthResponse(String token, Long userId, String email, Role role) {
        this.token = token;
        this.userId = userId;
        this.email = email;
        this.role = role;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getType() { return type; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public long getExpiresIn() { return expiresIn; }
}
