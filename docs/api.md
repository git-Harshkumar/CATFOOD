# CATFOOD REST API Reference

## Overview
The CATFOOD API is a RESTful API serving the DOGFOOD 2026 hackathon platform. All requests requiring authentication must include a Bearer JWT token in the `Authorization` header.

```text
Authorization: Bearer <JWT_TOKEN>
```

---

## Authentication & Authorization Model
The system enforces strict role-based access control (RBAC) with tenant isolation:
- `GLOBAL_ADMIN`: Unrestricted platform-wide administration.
- `EVENT_OWNER`: Full management rights over the specific hackathon.
- `CO_ORGANIZER`: Delegated management permissions (tracks, webhooks, certificates, bulk operations).
- `JUDGE`: Scoped to assigned projects and tracks; cannot view peer marks until unsealed.
- `PARTICIPANT`: Restricted to team formation, project submission, and authorized voting.
- `PUBLIC`: Unauthenticated access to public galleries, verified certificates, and public signing keys.

---

## Error Handling & Standard Contract
All error responses adhere to a consistent contract:
```json
{
  "success": false,
  "error": "Human readable error message",
  "message": "Human readable error message"
}
```
Internal error stacks and raw database exceptions are stripped before reaching clients.

---

## Core Endpoint Groups

### 1. Authentication
- `POST /api/auth/register` — Create user account with name, email, password.
- `POST /api/auth/login` — Authenticate and receive JWT token.
- `GET /api/auth/me` — Retrieve current authenticated session and profile.

### 2. Events & Setup
- `GET /api/events` — List published hackathons.
- `POST /api/events` — Create new event (Organizer).
- `GET /api/events/:id` — Get detailed event metadata, tracks, criteria, prizes.
- `PUT /api/events/:id` — Update event configuration (Organizer / Co-Organizer).
- `POST /api/events/:id/criteria` — Add evaluation criterion.
- `POST /api/events/:id/tracks` — Add hackathon track.
- `GET /api/events/:id/audit-logs` — Retrieve event audit trail (Organizer only).

### 3. Teams & Submissions
- `POST /api/teams` — Create team and assign creator as leader.
- `POST /api/teams/join` — Join team using invite code.
- `GET /api/teams/:id` — Retrieve team roster and submission.
- `POST /api/submissions/team/:teamId` — Submit project deliverable before deadline.
- `GET /projects` — Public project directory.
- `POST /projects/new` — Backward-compatible project submission endpoint.

### 4. Judging & Normalization
- `GET /api/judge/scores` — Judge reads own evaluations.
- `POST /api/judging/scores` — Submit multi-criterion scores.
- `GET /api/organizer/judging/export.csv` — Organizer CSV export of scores/standings.
- `POST /api/judging/pairwise/compare` — Submit Bradley-Terry comparison.
- `GET /api/judging/pairwise/standings` — Compute Bradley-Terry standings.
- `POST /api/events/:id/judges` — Invite judge with optional track constraints.
- `PATCH /api/judges/:id/status` — Accept/decline judge invitation.
- `POST /api/events/:id/assignments/batch` — Batch assign judges to submissions.
- `POST /api/events/:id/assignments/auto` — Algorithmic balanced assignment.

### 5. Community Voting & Anti-Abuse
- `POST /api/community/vote` — Cast community vote (Open / Email / Authenticated mode).
- `GET /api/community/results/:eventId` — Retrieve community results (Organizer or post-sealing).
- `POST /api/community/comments/:submissionId` — Post project feedback.
- `DELETE /api/community/comments/:id` — Soft-delete comment.

### 6. Outbound Webhooks
- `POST /api/webhooks/:eventId` — Register webhook endpoint (returns secret once).
- `GET /api/webhooks/:eventId` — List webhooks (secrets masked).
- `DELETE /api/webhooks/:id` — Delete webhook.
- `PATCH /api/webhooks/:id` — Update webhook active state or events.
- `POST /api/webhooks/:eventId/test` — Dispatch test ping.
- `GET /api/webhooks/:id/deliveries` — Inspect delivery history and retry schedules.

### 7. Certificates & Signed Judge Records
- `POST /api/certificates/:eventId/issue` — Issue Ed25519-signed certificate with SVG.
- `GET /api/certificates/event/:eventId` — List certificates.
- `POST /api/certificates/:id/revoke` — Revoke certificate with reason.
- `GET /api/certificates/verify/:id` — Public verification with PII masking.
- `GET /api/certificates/:id/artifact` — Download standalone SVG artifact.
- `POST /api/certificates/judge-record/:eventId` — Issue canonical Ed25519 judge record.
- `GET /api/certificates/judge/:userId/verify` — Public judge record verification.
- `GET /.well-known/signing-keys` — Public verification key registry.

### 8. Embeddable Public Gallery
- `GET /api/embed/gallery/:eventId` — Standalone responsive HTML iframe.
- `GET /api/embed/gallery/:eventId/data` — JSON gallery DTO.
- `GET /api/embed/:eventId/config` — Get embed configuration.
- `PUT /api/embed/:eventId/config` — Update embed configuration.
- `GET /embed/gallery.js` — Dynamic script loader (`data-event-id`).

### 9. Bulk Operations & Data Portability
- `POST /api/bulk/:eventId/import` — Atomic bulk import of projects and teams.
- `POST /api/bulk/:eventId/import/preview` — Dry-run validation preview.
- `POST /api/bulk/import/judges/:eventId` — Bulk import judges.
- `GET /api/bulk/:eventId/export` — Export portable `catfood-event-bundle` v1 JSON.
- `POST /api/bulk/event/import` — Restore complete event bundle into a new hackathon.
