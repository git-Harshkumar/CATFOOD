# Implementation Guide — Authentication & Authorization

## 1. Overview

The platform uses token-based authentication via JSON Web Tokens (JWT). Passwords are encrypted using bcrypt prior to database insertion.

---

## 2. Authentication Flow

```text
Client                              Server
  |                                   |
  |--- POST /api/auth/login --------->|
  |    { email, password }            | (Validates credentials with bcrypt)
  |<-- 200 OK with Bearer Token ------| (Signs JWT with user payload)
  |                                   |
  |--- GET /api/teams/my-teams ------>|
  |    Authorization: Bearer <token>  | (authMiddleware verifies token)
  |<-- 200 OK with Team Data ---------| (Attaches req.user)
```

---

## 3. Middleware Implementation

### 3.1 `authMiddleware.js`
Extracts `Authorization: Bearer <token>`, verifies signature via `jwt.verify()`, and retrieves the user from SQLite.

### 3.2 `roleMiddleware.js`
Enforces role-based permissions:
```javascript
router.post('/', authenticate, requireRole('ORGANIZER'), createEvent);
router.post('/score/:id', authenticate, requireRole('JUDGE'), submitScores);
```

---

## 4. Default Seeded Roles & Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **ORGANIZER** | `organizer@hack.com` | `password123` | Event creation, rubric definition, judge assignment, leaderboard publishing |
| **JUDGE** | `judge1@hack.com` | `password123` | Scoring projects against rubrics, qualitative feedback |
| **JUDGE** | `judge2@hack.com` | `password123` | Scoring projects against rubrics, qualitative feedback |
| **PARTICIPANT** | `alice@hack.com` | `password123` | Team leader (NeuralPulse), project submission |
| **PARTICIPANT** | `bob@hack.com` | `password123` | Team member (NeuralPulse) |
| **PARTICIPANT** | `charlie@hack.com` | `password123` | Team leader (QuantumLeap), project submission |
| **PARTICIPANT** | `dana@hack.com` | `password123` | Team member (QuantumLeap) |
