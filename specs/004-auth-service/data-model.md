# Data Model & Schema Specification: Auth Service

**Feature**: 004-auth-service  
**Date**: 2026-08-18  

## 1. Database Entity: `User` (`users` table)

- **Table Name**: `users`
- **Fields & Constraints**:
  - `id`: `BIGINT`, Primary Key, Identity Auto-increment.
  - `email`: `VARCHAR(255)`, NON-NULL, UNIQUE, Indexed.
  - `password_hash`: `VARCHAR(255)`, NON-NULL (BCrypt hash string with cost 12).
  - `role`: `VARCHAR(32)`, NON-NULL (Enum: `LEARNER`, `ADMIN`, `CONTRIBUTOR`).
  - `created_at`: `TIMESTAMP WITH TIME ZONE`, NON-NULL, Default `CURRENT_TIMESTAMP`.
  - `updated_at`: `TIMESTAMP WITH TIME ZONE`, NON-NULL, Default `CURRENT_TIMESTAMP`.

---

## 2. DTO Schemas

### `RegisterRequest`
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

### `LoginRequest`
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

### `AuthResponse`
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "type": "Bearer",
  "userId": 1,
  "email": "user@example.com",
  "role": "LEARNER",
  "expiresIn": 86400
}
```

### `ErrorResponse`
```json
{
  "status": 401,
  "error": "Unauthorized",
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid email or password",
  "timestamp": "2026-08-18T08:00:00Z"
}
```
