# REST API Specification

All API endpoints return JSON following a standard envelope:

```json
{
  "success": true,
  "message": "Description of action result",
  "data": { ... }
}
```

Errors follow this envelope:

```json
{
  "success": false,
  "message": "Error description",
  "errors": { "field": "Validation error" }
}
```

---

## 1. Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user (`email`, `password`, `name`, `role`). Returns user and JWT. |
| `POST` | `/api/auth/login` | Public | Authenticate user (`email`, `password`). Returns user and JWT. |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile and associated events/teams. |

---

## 2. Event Endpoints (`/api/events`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | Public | List all hackathon events. |
| `GET` | `/api/events/:id` | Public | Get event details with criteria, judges, and teams. |
| `POST` | `/api/events` | Organizer | Create a new hackathon with deadline and rubrics. |
| `PUT` | `/api/events/:id` | Organizer | Update event metadata (only if owner). |
| `POST` | `/api/events/:id/criteria` | Organizer | Append an evaluation criterion to rubric. |
| `POST` | `/api/events/:id/judges` | Organizer | Assign a verified judge by email. |
| `POST` | `/api/events/:id/publish-leaderboard` | Organizer | Toggle `isLeaderboardPublished` flag. |

---

## 3. Team Endpoints (`/api/teams`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/teams` | Authenticated | Create a team for an event. Generates invite code. |
| `POST` | `/api/teams/join` | Authenticated | Join team via `inviteCode`. Enforces member limits. |
| `GET` | `/api/teams/my-teams` | Authenticated | List all teams current user belongs to. |
| `GET` | `/api/teams/:id` | Authenticated | Get team roster and submission. |
| `POST` | `/api/teams/:id/leave` | Authenticated | Leave team or transfer leadership. |

---

## 4. Submission Endpoints (`/api/submissions`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/submissions/team/:teamId` | Team Member / Leader | Submit or update deliverables. **Enforces server deadline**. |
| `GET` | `/api/submissions/:id` | Authenticated | Get submission details and links. |
| `GET` | `/api/submissions/event/:eventId` | Authenticated | List all submissions for an event. |

---

## 5. Judging Endpoints (`/api/judging`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/judging/queue` | Judge / Organizer | Retrieve judge evaluation queue and status. |
| `GET` | `/api/judging/scores/:submissionId` | Judge / Organizer | Retrieve judge's submitted marks for a project. |
| `POST` | `/api/judging/score/:submissionId` | Judge | Submit rubric scores and qualitative feedback. |
| `GET` | `/api/judging/leaderboard/:eventId` | Public (if published) / Staff | Compute normalized weighted standings and rankings. |
