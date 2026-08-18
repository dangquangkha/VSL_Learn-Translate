package com.vsl.auth.service;

import com.vsl.auth.dto.AuthResponse;
import com.vsl.auth.dto.LoginRequest;
import com.vsl.auth.dto.RegisterRequest;
import com.vsl.auth.entity.Role;
import com.vsl.auth.entity.User;
import com.vsl.auth.repository.UserRepository;
import com.vsl.auth.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// EARS[FR-002, FR-003, FR-007, FR-008]: AuthService registration & login business logic
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.getPassword() == null || request.getPassword().length() < 8) {
            throw new IllegalArgumentException("INVALID_PASSWORD_LENGTH");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalStateException("EMAIL_ALREADY_EXISTS");
        }

        String encodedPassword = passwordEncoder.encode(request.getPassword());
        User user = new User(request.getEmail(), encodedPassword, Role.LEARNER);
        User savedUser = userRepository.save(user);

        String token = jwtTokenProvider.generateToken(savedUser.getId(), savedUser.getEmail(), savedUser.getRole());
        return new AuthResponse(token, savedUser.getId(), savedUser.getEmail(), savedUser.getRole());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("INVALID_CREDENTIALS"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("INVALID_CREDENTIALS");
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getRole());
    }
}
