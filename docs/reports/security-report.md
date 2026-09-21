# Security & Access Control Audit Report

## 1. Threat Model & Security Posture

The Hackathon Judgment Platform models the following primary threats:
1. **Tampering with Submission Cutoffs**: Malicious participants attempting to push changes after the announced submission deadline.
2. **Cross-Team Impersonation**: Participants attempting to overwrite or access other teams' project submissions or invite codes.
3. **Privilege Escalation**: Participants or Judges attempting to create events, alter criteria weights, or publish leaderboards prematurely.
4. **Grading Manipulation**: Participants attempting to submit score payloads to boost their own standings or penalize competitors.
5. **Score Leakage**: Unsanctioned disclosure of individual judge marks and competitor scores prior to the official award ceremony.

---

## 2. Security Boundaries & Countermeasures

### 2.1 Password Security & Credential Storage
- Passwords are never stored in plaintext.
- Utilizes `bcryptjs` with salt round factor 10.
- Login timing does not expose whether the email exists versus incorrect password (uniform `401 Unauthorized` responses).

### 2.2 Cryptographic Token Authentication
- Stateful session cookies are replaced by tamper-proof JSON Web Tokens (JWT) signed using HMAC-SHA256 (`process.env.JWT_SECRET`).
- Authentication middleware (`authMiddleware.js`) validates token integrity and cross-references user active existence against the SQLite database to revoke stale or deleted tokens.

### 2.3 Strict Server-Side Deadline Enforcement
- Client-side countdown timers are strictly visual conveniences.
- In `submissionService.js`:
  ```javascript
  const now = new Date();
  const deadline = new Date(team.event.deadline);
  if (now > deadline && !isOrganizer) {
    const error = new Error('Submission deadline has passed. Modifications are strictly prohibited.');
    error.statusCode = 403;
    throw error;
  }
  ```
- Submissions past the server's authoritative system time are rejected with `403 Forbidden`.

### 2.4 Multi-Tenant & Cross-Team Isolation
- Team membership is strictly bound using unique database constraints `@@unique([teamId, userId])` and event-level unique checks.
- When creating or modifying a submission:
  ```javascript
  const isMember = team.members.some((m) => m.userId === userId);
  if (!isMember && !isOrganizer) {
    throw new Error('Unauthorized. You can only submit or edit projects for your own team.');
  }
  ```
- Any unauthorized attempts return `403 Forbidden`.

### 2.5 Rubric Score Protection & Judge Authorization
- Only authenticated users with the `JUDGE` role can submit evaluation scores to `/api/judging/score/:submissionId`.
- Participant score submission attempts are rejected with `403 Forbidden`.
- Submitted numeric scores are bounded between `0` and `criterion.maxScore`. Out-of-bound marks trigger `400 Bad Request`.
- If an event's `isLeaderboardPublished` flag is `false`, non-organizer and non-judge users requesting the leaderboard are blocked with `403 Forbidden`, and individual judge scores are redacted from submission responses.

### 2.6 SQL Injection & Malformed Payload Immunity
- Database interactions occur exclusively via Prisma ORM parameterized queries.
- Raw SQL string interpolation is strictly prohibited.
- Malformed JSON payloads and invalid types are trapped by `validateMiddleware.js` and `errorMiddleware.js`.

---

## 3. Automated Security Verification

The automated test suite in `tests/` explicitly verifies these security boundaries:
- `tests/auth/auth.test.js`: Unauthorized requests, invalid tokens, duplicate emails.
- `tests/events/events.test.js`: Non-organizer event mutation rejections.
- `tests/teams/teams.test.js`: Team member caps, duplicate memberships, invalid invite codes.
- `tests/submissions/submissions.test.js`: Cross-team tampering prevention and deadline cutoff enforcement.
- `tests/integration/integration.test.js`: Participant score injection rejections and unpublished leaderboard access blocks.
