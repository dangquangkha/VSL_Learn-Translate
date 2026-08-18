# OpenAPI Contract: Authentication & Authorization Service API

**Feature**: 004-auth-service  
**Base Path**: `/api/auth`  

---

## 1. Endpoints

### `POST /api/auth/register`
- **Summary**: Register a new user account.
- **Request Body**: `RegisterRequest`
- **Responses**:
  - `201 Created`: Returns `AuthResponse` with JWT token.
  - `400 Bad Request`: Password $< 8$ chars or invalid email format.
  - `409 Conflict`: Email already exists (`EMAIL_ALREADY_EXISTS`).

---

### `POST /api/auth/login`
- **Summary**: Authenticate user and issue JWT token.
- **Request Body**: `LoginRequest`
- **Responses**:
  - `200 OK`: Returns `AuthResponse` with JWT token (24h validity).
  - `401 Unauthorized`: Generic invalid credentials error (`INVALID_CREDENTIALS`).

---

### Protected Endpoints Header Requirement
All requests to protected endpoints (`/api/practice/**`, `/api/admin/**`) MUST include:
```http
Authorization: Bearer <JWT_TOKEN>
```
