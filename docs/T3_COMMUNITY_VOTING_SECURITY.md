# T3 Community Voting, Gallery & Anti-Abuse Security Model

## 1. Overview
The **CATFOOD** platform provides a cryptographically secure, resilient, and multi-tenant Community Voting, Gallery, and Anti-Abuse engine designed for high-concurrency hackathons. This document details the security guarantees, mathematical models, authorization mechanisms, and anti-abuse safeguards implemented across the system.

---

## 2. Voter Identity Models

The platform enforces three distinct voter identity assurance modes configured at the hackathon event level:

| Mode | Identity Assurance | Voter Identifier | Verification Mechanism |
| :--- | :--- | :--- | :--- |
| **`AUTHENTICATED`** | **Highest** | `user:${userId}` | Verified JWT session (`req.user.id`). Client-provided `voterEmail` is ignored. Self-voting is strictly prevented by checking team rosters. |
| **`EMAIL`** | **Medium** | `email:${verifiedEmail}` | Cryptographically secure, short-lived challenge tokens sent to the voter's email address. Unverified email strings are strictly rejected. |
| **`OPEN`** | **Lowest** | `open:token:${uuid}` | Server-issued non-null session token returned upon first vote. Requests are rate-limited per token and IP. |

> **Security Note on `OPEN` Mode:** `OPEN` mode provides weaker identity assurance than `AUTHENTICATED` or `EMAIL` modes. It is protected by per-token database constraints and IP sliding-window rate limiting, but should only be enabled for public showcase voting where registration friction is undesirable.

---

## 3. Voting Mathematics & Credit Budget

### 3.1 Quadratic Voting Formula
Community voting uses quadratic voting to reflect intensity of preference while curbing disproportionate influence from coordinated blocks or vote stacking.

$$\text{Contribution to Project Score} = \sqrt{\text{credits}}$$

$$\text{Total Project Score} = \sum_{v \in \text{votes}} \sqrt{\text{credits}_v}$$

* A vote of $1 \text{ credit}$ awards $1.00 \text{ score}$.
* A vote of $4 \text{ credits}$ awards $2.00 \text{ score}$.
* A vote of $9 \text{ credits}$ awards $3.00 \text{ score}$.
* A vote of $16 \text{ credits}$ awards $4.00 \text{ score}$.

### 3.2 Server-Enforced Voter Credit Budget
Voters receive an event-level credit allocation budget:
$$\text{totalCredits} = \text{event.communityVoteCreditBudget} \quad (\text{default: } 100)$$

For every voter participating in an event, a `VoterBalance` record tracks:
* `totalCredits`: Initial budget allocated for the event
* `usedCredits`: Cumulative credits spent across all submissions
* `remainingCredits`: Budget available for subsequent votes ($\text{remainingCredits} \ge \text{requestedCredits}$)

Credit balances are checked and decremented atomically within a database transaction. If $\text{requestedCredits} > \text{remainingCredits}$, the server rejects the request with HTTP `400 Bad Request`.

### 3.3 Credit Input Validation
Client-supplied `credits` values are strictly validated. Any value that is negative ($\le 0$), a decimal/floating-point number, `NaN`, `Infinity`, or an excessively large number ($> \text{budget}$) is rejected before database execution.

---

## 4. Atomic Vote Creation & Duplicate Protection

### 4.1 Database Unique Constraints
Duplicate vote protection does not rely on nullable columns or sequential auto-incrementing identifiers. The schema enforces:
```prisma
model CommunityVote {
  ...
  voterIdentifier String
  @@unique([submissionId, voterIdentifier])
}
```
And credit balances enforce:
```prisma
model VoterBalance {
  ...
  @@unique([eventId, voterIdentifier])
}
```

### 4.2 Race Condition & Concurrency Defense
Vote validation, balance deduction, and vote insertion occur within an atomic `prisma.$transaction`.
* If 20 concurrent identical vote requests hit the API simultaneously, SQLite and Prisma enforce unique row locking:
  * **Exactly 1 vote succeeds** (HTTP `201 Created`).
  * **All concurrent duplicate attempts are caught** (HTTP `409 Conflict` or HTTP `429 Too Many Requests`).
* Unique constraint violations (`P2002` / `P2034`) are gracefully mapped to `409 Conflict` rather than exposing internal database errors.

---

## 5. Self-Voting Prevention

Participants cannot vote for projects submitted by their own team.
* Before any vote is recorded, the server loads the project's `Team` roster.
* If `req.user.id` matches any member of the team (`team.members.some(m => m.userId === req.user.id)`), the vote is rejected with HTTP `403 Forbidden`.
* Self-voting attempts are audited with `COMMUNITY_VOTE_SELF_REJECTED`.

---

## 6. Result Sealing & Confidentiality

During an active hackathon, leaderboard rankings and pairwise evaluation metrics remain confidential:
* **Sealed Endpoints:**
  * `GET /api/community/:eventId/results`
  * `GET /api/judging/:eventId/pairwise/standings`
  * `GET /api/judging/leaderboard`
* **Access Rules:**
  * **Participants, judges, and anonymous voters:** Denied with HTTP `403 Forbidden` until the organizer explicitly sets `isCommunityResultsRevealed: true` or `isLeaderboardPublished: true`.
  * **Event Organizers and Super Admins:** Authorized to inspect standings and tallies at all times to monitor judging health.

---

## 7. Multi-Tenant Audit Logging

Every audit event is strictly scoped to its event tenant:
* `AuditLog` records include `eventId`, `actorId`, `action`, `targetType`, `targetId`, and JSON `metadata`.
* The organizer audit endpoint `GET /api/events/:id/audit-logs` validates that the requesting user has `canManageEvent(user, eventId)` authorization.
* **Cross-Tenant Isolation:** An organizer of Event A is forbidden (HTTP `403`) from accessing Event B's audit trail.
* **Audited Actions:**
  * `COMMUNITY_VOTE_CAST`
  * `COMMUNITY_VOTE_DUPLICATE_REJECTED`
  * `COMMUNITY_VOTE_SELF_REJECTED`
  * `COMMUNITY_VOTE_INVALID_CREDITS`
  * `COMMUNITY_VOTE_UNAUTHORIZED`
  * `COMMUNITY_VOTE_VERIFICATION_FAILED`

---

## 8. Anti-Abuse & Rate Limiting

### 8.1 IP Spoofing Defense
`req.headers['x-forwarded-for']` is never trusted directly. Express is configured with `app.set('trust proxy', 'loopback')`, ensuring that `req.ip` reflects the actual peer IP address or trusted upstream reverse proxy.

### 8.2 Sliding-Window Token-Bucket Rate Limiter
The platform employs a sliding-window token bucket limiter (`rateLimitService.js`) with automatic memory eviction:
* Vote attempts: 15 requests / minute / voter
* Comment creation: 5 comments / minute / user
* Email verification requests: 3 requests / 5 minutes / IP
* Exceeding thresholds returns HTTP `429 Too Many Requests`.

---

## 9. Comments Security & Moderation

* **Authentication Required:** Only authenticated platform accounts can submit comments. Anonymous impersonation via client-supplied `authorName`/`authorEmail` is blocked; author details are derived directly from `req.user`.
* **Moderation & Deletion (`DELETE /api/community/comments/:id`):**
  * Authorized to delete: Comment author, Submission team leader, Event organizer, and Super Admin.
  * Deletions are **soft deletes** (`isDeleted: true`, `deletedAt: new Date()`). Soft-deleted comments are excluded from public discussion queries to maintain audit integrity.

---

## 10. Embed Gallery Stored XSS Neutralization

The embeddable gallery widget (`/api/embed/gallery/:eventId`) renders public project cards. All user-supplied text fields (`title`, `tagline`, `description`, `teamName`, `trackName`) are rigorously HTML-entity escaped (`escapeHtml`). Repository and demo URLs are restricted to `http:` and `https:` protocols; dangerous URL schemes like `javascript:` and `data:` are neutralized to safe fallback links.
