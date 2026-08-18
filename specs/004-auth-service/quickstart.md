# Quickstart & Validation Guide: Auth Service

**Feature**: 004-auth-service  
**Date**: 2026-08-18  

## 1. Local Build & Run

Ensure PostgreSQL is running and environment variable `$JWT_SECRET` is set:

```bash
export JWT_SECRET="vsl_learn_translate_super_secret_jwt_key_256bits_minimum_length!"
mvn spring-boot:run
```

---

## 2. Automated Integration & Unit Tests

Run Spring Security integration tests:

```bash
mvn test -Dtest=AuthControllerTest,JwtTokenProviderTest,SecurityConfigTest
```

---

## 3. Manual Curl Validation

### Registration Test:
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"learner@example.com","password":"Password123!"}'
```

### Login Test:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"learner@example.com","password":"Password123!"}'
```

### RBAC Protection Test (Forbidden for LEARNER on ADMIN endpoint):
```bash
curl -X GET http://localhost:8080/api/admin/stats \
  -H "Authorization: Bearer <LEARNER_JWT_TOKEN>"
```
*Expected Result*: `403 Forbidden`.
