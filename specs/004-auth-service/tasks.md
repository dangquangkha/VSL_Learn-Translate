# Tasks: Authentication & Authorization Service

**Feature**: `004-auth-service` | **Branch**: `004-auth-service`  
**Input Documents**: [`spec.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/004-auth-service/spec.md), [`plan.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/004-auth-service/plan.md), [`research.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/004-auth-service/research.md), [`data-model.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/004-auth-service/data-model.md), [`auth_api_contract.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/004-auth-service/contracts/auth_api_contract.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Goal**: Initialize Maven/Gradle Spring Boot directory layout and Flyway DDL migration scripts.

- [X] T001 Initialize Java package structure under `backend/src/main/java/com/vsl/auth/`
- [X] T002 Create DDL schema migration script `V1__init_users_schema.sql` in `backend/src/main/resources/db/migration/`
- [X] T003 [P] Create admin seed migration script `V2__seed_admin_user.sql` in `backend/src/main/resources/db/migration/` (FR-012)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Goal**: Domain models, DTOs, Repository layer, BCrypt encoder bean, and JWT provider module required before API controllers.

- [X] T004 [P] Implement `Role` enum and `User` JPA Entity in `backend/src/main/java/com/vsl/auth/entity/User.java`
- [X] T005 [P] Create `RegisterRequest`, `LoginRequest`, `AuthResponse`, and `ErrorResponse` DTOs in `backend/src/main/java/com/vsl/auth/dto/`
- [X] T006 [P] Create `UserRepository` interface in `backend/src/main/java/com/vsl/auth/repository/UserRepository.java`
- [X] T007 [P] Implement `JwtTokenProvider` utility (HMAC-SHA256, 24h expiration) in `backend/src/main/java/com/vsl/auth/security/JwtTokenProvider.java` (FR-003, NFR-002)

---

## Phase 3: User Story 1 - Account Registration & Password Hashing (Priority: P1) 🎯 MVP

**Goal**: Provide secure account registration with BCrypt password hashing (cost factor 12) and duplicate email conflict rejection.

**Independent Test**: Register a new user via `POST /api/auth/register`; verify user row exists in DB with BCrypt hash string starting with `$2a$12$`.

### Implementation for User Story 1
- [X] T008 [P] [US1] Configure BCryptPasswordEncoder bean (cost factor 12) in `backend/src/main/java/com/vsl/auth/security/SecurityConfig.java` (FR-001)
- [X] T009 [US1] Implement registration logic in `AuthService.register()` in `backend/src/main/java/com/vsl/auth/service/AuthService.java` handling duplicate emails (FR-002, FR-007, FR-011)
- [X] T010 [US1] Implement `POST /api/auth/register` endpoint in `backend/src/main/java/com/vsl/auth/controller/AuthController.java`

---

## Phase 4: User Story 2 - User Login & JWT Issuance (Priority: P2)

**Goal**: Provide secure login authentication and JWT bearer token issuance.

**Independent Test**: Send valid credentials to `POST /api/auth/login`; receive HTTP 200 containing valid JWT token expiring in 24 hours.

### Implementation for User Story 2
- [X] T011 [US2] Implement login authentication & JWT issuance in `AuthService.login()` in `backend/src/main/java/com/vsl/auth/service/AuthService.java` (FR-003, FR-008)
- [X] T012 [US2] Implement `POST /api/auth/login` endpoint in `backend/src/main/java/com/vsl/auth/controller/AuthController.java`
- [X] T013 [US2] Write unit tests for login authentication in `backend/src/test/java/com/vsl/auth/AuthServiceTestRunner.java`

---

## Phase 5: User Story 3 - Spring Security Filter & RBAC Authorization (Priority: P3)

**Goal**: Enforce JWT authentication filter and role-based access control (RBAC) across `/api/admin/**` and protected endpoints.

**Independent Test**: Send GET to `/api/admin/stats` with a `LEARNER` token (receives 403 Forbidden) and `ADMIN` token (receives 200 OK).

### Implementation for User Story 3
- [X] T014 [US3] Implement `JwtAuthenticationFilter` in `backend/src/main/java/com/vsl/auth/security/JwtAuthenticationFilter.java` (FR-004, FR-009)
- [X] T015 [US3] Configure Spring Security RBAC authorization rules in `SecurityConfig.java` enforcing `/api/admin/**` ADMIN protection (FR-005, FR-006, FR-010)
- [X] T016 [US3] Write Spring Security Integration tests in `backend/src/test/java/com/vsl/auth/AuthServiceTestRunner.java` (AC-004, AC-005)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Global exception handling, security logging hardening, and quickstart validation.

- [X] T017 Create GlobalExceptionHandler for Auth exceptions (`EMAIL_ALREADY_EXISTS`, `INVALID_CREDENTIALS`) in `backend/src/main/java/com/vsl/auth/exception/GlobalExceptionHandler.java`
- [X] T018 Execute manual curl & automated verification scenarios in `specs/004-auth-service/quickstart.md`

---

## Dependencies & Execution Order

1. **Phase 1 (Setup)**: Can start immediately.
2. **Phase 2 (Foundational)**: Depends on Phase 1. Tasks T004–T007 can run in parallel.
3. **Phase 3 (User Story 1 - MVP)**: Depends on Phase 2.
4. **Phase 4 (User Story 2)**: Depends on Phase 3.
5. **Phase 5 (User Story 3)**: Depends on Phase 4.
6. **Phase 6 (Polish)**: Depends on Phase 5.
