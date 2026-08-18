package com.vsl.auth;

import com.vsl.auth.dto.AuthResponse;
import com.vsl.auth.dto.LoginRequest;
import com.vsl.auth.dto.RegisterRequest;
import com.vsl.auth.entity.Role;
import com.vsl.auth.entity.User;
import com.vsl.auth.repository.UserRepository;
import com.vsl.auth.security.JwtTokenProvider;

public class MockUserRepository implements UserRepository {
    private User savedUser;

    @Override
    public <S extends User> S save(S entity) {
        entity.setId(1L);
        this.savedUser = entity;
        return entity;
    }

    @Override
    public java.util.Optional<User> findByEmail(String email) {
        if (savedUser != null && savedUser.getEmail().equals(email)) {
            return java.util.Optional.of(savedUser);
        }
        return java.util.Optional.empty();
    }

    @Override
    public boolean existsByEmail(String email) {
        return savedUser != null && savedUser.getEmail().equals(email);
    }

    // Unimplemented JPA methods
    @Override public java.util.List<User> findAll() { return null; }
    @Override public java.util.List<User> findAllById(Iterable<Long> ids) { return null; }
    @Override public <S extends User> java.util.List<S> saveAll(Iterable<S> entities) { return null; }
    @Override public void flush() {}
    @Override public <S extends User> S saveAndFlush(S entity) { return null; }
    @Override public <S extends User> java.util.List<S> saveAllAndFlush(Iterable<S> entities) { return null; }
    @Override public void deleteAllInBatch(Iterable<User> entities) {}
    @Override public void deleteAllByIdInBatch(Iterable<Long> ids) {}
    @Override public void deleteAllInBatch() {}
    @Override public User getOne(Long id) { return null; }
    @Override public User getById(Long id) { return null; }
    @Override public User getReferenceById(Long id) { return null; }
    @Override public <S extends User> java.util.List<S> findAll(org.springframework.data.domain.Example<S> example) { return null; }
    @Override public <S extends User> java.util.List<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Sort sort) { return null; }
    @Override public java.util.List<User> findAll(org.springframework.data.domain.Sort sort) { return null; }
    @Override public org.springframework.data.domain.Page<User> findAll(org.springframework.data.domain.Pageable pageable) { return null; }
    @Override public java.util.Optional<User> findById(Long id) { return java.util.Optional.ofNullable(savedUser); }
    @Override public boolean existsById(Long id) { return savedUser != null; }
    @Override public long count() { return savedUser != null ? 1 : 0; }
    @Override public void deleteById(Long id) {}
    @Override public void delete(User entity) {}
    @Override public void deleteAllById(Iterable<? extends Long> ids) {}
    @Override public void deleteAll(Iterable<? extends User> entities) {}
    @Override public void deleteAll() {}
    @Override public <S extends User> java.util.Optional<S> findOne(org.springframework.data.domain.Example<S> example) { return null; }
    @Override public <S extends User> org.springframework.data.domain.Page<S> findAll(org.springframework.data.domain.Example<S> example, org.springframework.data.domain.Pageable pageable) { return null; }
    @Override public <S extends User> long count(org.springframework.data.domain.Example<S> example) { return 0; }
    @Override public <S extends User> boolean exists(org.springframework.data.domain.Example<S> example) { return false; }
    @Override public <S extends User, R> R findBy(org.springframework.data.domain.Example<S> example, java.util.function.Function<org.springframework.data.domain.FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
}
