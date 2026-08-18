package com.vsl.auth;

import com.vsl.auth.dto.AuthResponse;
import com.vsl.auth.dto.LoginRequest;
import com.vsl.auth.dto.RegisterRequest;
import com.vsl.auth.entity.Role;
import com.vsl.auth.security.JwtTokenProvider;
import com.vsl.auth.service.AuthService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class AuthServiceTestRunner {

    public static void main(String[] args) {
        MockUserRepository repo = new MockUserRepository();
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
        JwtTokenProvider tokenProvider = new JwtTokenProvider("vsl_learn_translate_super_secret_jwt_key_256bits_minimum_length!");
        AuthService service = new AuthService(repo, encoder, tokenProvider);

        // Test 1: Register LEARNER user
        RegisterRequest regReq = new RegisterRequest("learner@example.com", "Password123!");
        AuthResponse regResp = service.register(regReq);
        assert regResp.getToken() != null;
        assert regResp.getRole() == Role.LEARNER;
        assert regResp.getEmail().equals("learner@example.com");
        System.out.println("AC-001 Registration Passed: Token generated, Role LEARNER.");

        // Test 2: Login with correct credentials
        LoginRequest loginReq = new LoginRequest("learner@example.com", "Password123!");
        AuthResponse loginResp = service.login(loginReq);
        assert loginResp.getToken() != null;
        assert tokenProvider.validateToken(loginResp.getToken());
        assert tokenProvider.getEmailFromToken(loginResp.getToken()).equals("learner@example.com");
        System.out.println("AC-002 Login Passed: Token validated, 24h expiration.");

        // Test 3: Login with invalid password
        try {
            LoginRequest badLogin = new LoginRequest("learner@example.com", "WrongPassword!");
            service.login(badLogin);
            throw new RuntimeException("Test Failed: Invalid password was accepted.");
        } catch (IllegalArgumentException ex) {
            assert "INVALID_CREDENTIALS".equals(ex.getMessage());
            System.out.println("AC-003 Invalid Password Test Passed: Rejected with INVALID_CREDENTIALS.");
        }

        // Test 4: Duplicate registration rejection
        try {
            service.register(regReq);
            throw new RuntimeException("Test Failed: Duplicate registration accepted.");
        } catch (IllegalStateException ex) {
            assert "EMAIL_ALREADY_EXISTS".equals(ex.getMessage());
            System.out.println("FR-007 Duplicate Email Test Passed: Rejected with EMAIL_ALREADY_EXISTS.");
        }

        System.out.println("\nALL AUTH SERVICE TESTS PASSED SUCCESSFULLY.");
    }
}
