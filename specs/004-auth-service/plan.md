# Implementation Plan: Authentication & Authorization Service

**Branch**: `004-auth-service` | **Date**: 2026-08-18 | **Spec**: [spec.md](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/004-auth-service/spec.md)

---

## Summary

Implement a stateless RESTful Authentication and Authorization service using Spring Boot 3, Spring Security 6, BCrypt password hashing (cost factor 12), and JWT (HMAC-SHA256, 24h expiration). Include user registration, login authentication, RBAC authorization filter (`LEARNER`, `ADMIN`, `CONTRIBUTOR`), and Flyway database migrations for `users` DDL and initial `ADMIN` seeding.

---

## Technical Context

- **Language/Version**: Java 21 / Spring Boot 3.2+
- **Primary Dependencies**: Spring Web, Spring Security 6, Spring Data JPA, `io.jsonwebtoken` (`jjwt` 0.12.x), Flyway Migration
- **Storage**: PostgreSQL (`users` table)
- **Testing**: JUnit 5, Mockito, Spring Security Test, Testcontainers / H2
- **Target Platform**: Azure for Students / VM (Spring Boot Monolith module)
- **Project Type**: Web Service / Monolith Module (`backend/src/main/java/com/vsl/auth`)
- **Performance Goals**: P95 response time < 200ms for register/login APIs
- **Constraints**: BCrypt cost 12, 24h JWT expiration, zero plaintext password logging

---

## Constitution Check

*GATE: All checks PASSED.*

| Constitution Principle | Compliance Status | Implementation Strategy |
|---|---|---|
| **I. Client-Side Inference Zero Backend Predict** | PASS | Auth Service only manages account identity & RBAC tokens. No `/predict` endpoints. |
| **VII. Executable Spec & EARS Notation** | PASS | All 12 FRs tagged with EARS notation (`FR-001` through `FR-012`). |

---

## Project Structure

### Documentation (this feature)

```text
specs/004-auth-service/
├── spec.md              # Feature Specification
├── plan.md              # Implementation Plan ($speckit-plan output)
├── research.md          # Phase 0 Research Findings
├── data-model.md        # Phase 1 Data Model & Schemas
├── quickstart.md        # Phase 1 Quickstart Validation Guide
├── contracts/           # Phase 1 OpenAPI API Contract
│   └── auth_api_contract.md
└── checklists/
    └── requirements.md  # Specification Quality Checklist
```

### Source Code Layout

```text
backend/
├── src/main/java/com/vsl/auth/
│   ├── controller/
│   │   └── AuthController.java
│   ├── dto/
│   │   ├── RegisterRequest.java
│   │   ├── LoginRequest.java
│   │   └── AuthResponse.java
│   ├── entity/
│   │   ├── User.java
│   │   └── Role.java
│   ├── repository/
│   │   └── UserRepository.java
│   ├── security/
│   │   ├── JwtAuthenticationFilter.java
│   │   ├── JwtTokenProvider.java
│   │   └── SecurityConfig.java
│   └── service/
│       └── AuthService.java
├── src/main/resources/
│   └── db/migration/
│       ├── V1__init_users_schema.sql
│       └── V2__seed_admin_user.sql
└── src/test/java/com/vsl/auth/
    ├── AuthControllerTest.java
    └── JwtTokenProviderTest.java
```

---

## Complexity Tracking

> No constitution violations detected. Standard Spring Security 6 stateless JWT architecture applied.
