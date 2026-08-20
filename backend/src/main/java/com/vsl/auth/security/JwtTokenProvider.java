package com.vsl.auth.security;

import com.vsl.auth.entity.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

// EARS[FR-003, NFR-002]: HMAC-SHA256 JWT Token Provider with 24h expiration
@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expirationMs = 86400000L; // 24 hours in ms

    /**
     * KHONG THEM GIA TRI MAC DINH VAO @Value NAY.
     *
     * Truoc day cho la: @Value("${jwt.secret:vsl_learn_translate_super_..._length!}")
     * Repo nay PUBLIC tren GitHub, nen gia tri mac dinh do la khoa ky token
     * cong khai: chi can quen dat bien moi truong JWT_SECRET la bat ky ai doc
     * repo cung tu ky duoc token hop le cho BAT KY tai khoan nao, ke ca ADMIN.
     * AGENTS.md muc 3 xep "Token Secrets" vao nhom CAM hardcode tuyet doi.
     *
     * Bo mac dinh -> thieu bien moi truong thi app KHONG khoi dong duoc. Do la
     * co y: that bai ngay luc khoi dong thi thay ngay, con chay voi khoa cong
     * khai thi khong ai biet cho den khi bi chiem tai khoan.
     *
     * Cach dat bien khi chay local: xem backend/AGENTS.md.
     */
    public JwtTokenProvider(@Value("${jwt.secret}") String jwtSecret) {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(Long userId, String email, Role role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("email", email)
                .claim("role", role.name())
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
        return Long.parseLong(claims.getSubject());
    }

    public String getEmailFromToken(String token) {
        Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
        return claims.get("email", String.class);
    }

    public String getRoleFromToken(String token) {
        Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
        return claims.get("role", String.class);
    }
}
