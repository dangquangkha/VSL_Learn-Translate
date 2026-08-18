# Phase 0 Research: Authentication & Authorization Service

**Feature**: 004-auth-service  
**Date**: 2026-08-18  

## Research Decisions & Technical Architecture

### 1. Spring Security 6 & Stateless JWT Architecture

- **Decision**: Implement a stateless security filter chain using `SecurityFilterChain` in Spring Boot 3 / Spring Security 6.
- **Rationale**: Eliminates server-side session state overhead, making the API stateless and highly performant. The JWT Bearer token is validated on each incoming request in `JwtAuthenticationFilter`.
- **BCrypt Configuration**: Password encoder bean initialized with `BCryptPasswordEncoder(12)` matching NFR-002.

---

### 2. JWT Generation & Verification (`io.jsonwebtoken`)

- **Decision**: Use `jjwt-api` / `jjwt-impl` / `jjwt-jackson` (version `0.12.x`) with HMAC-SHA256 (`Keys.hmacShaKeyFor`).
- **Secret Management**: Read `$JWT_SECRET` environment variable (minimum 256-bit / 32 bytes).
- **Token Claims**: `sub` (User ID / Email), `email`, `role`, `iat`, `exp` (24h expiration = 86,400,000 ms).

---

### 3. Database Migration & Admin Bootstrap (Flyway)

- **Decision**: Create Flyway migration script `V1__init_users_schema.sql` for table DDL and `V2__seed_admin_user.sql` for initial admin seeding.
- **Rationale**: Guarantees deterministic database initialization across staging, production, and CI environments.

---

### 4. RBAC Authorization Rules Matrix

| Endpoint Pattern | Allowed HTTP Methods | Required Role / Authority |
|---|---|---|
| `/api/auth/register` | `POST` | `PermitAll` (Guest) |
| `/api/auth/login` | `POST` | `PermitAll` (Guest) |
| `/api/signs/**`, `/api/phrases/**` | `GET` | `PermitAll` (Public Vocabulary) |
| `/api/practice/**`, `/api/learning/**` | `GET`, `POST` | `LEARNER` or `ADMIN` |
| `/api/admin/**` | `GET`, `POST`, `PATCH`, `DELETE` | `ADMIN` strictly |
