# Implementation Guide — Submissions & Deadline Enforcement

## 1. Overview

Submissions represent the final engineering deliverable produced by a team. Only team members can create or update their team's project deliverable.

---

## 2. Submission Data Model

| Field | Type | Description |
| :--- | :--- | :--- |
| `title` | String (Required) | Name of the project |
| `tagline` | String (Optional) | Short 1-line elevator pitch |
| `description` | String (Required) | Full overview, architecture, and innovation details |
| `repoUrl` | URL (Optional) | GitHub / GitLab / Bitbucket source code link |
| `demoUrl` | URL (Optional) | Public deployed web application or cloud prototype |
| `videoUrl` | URL (Optional) | YouTube / Loom pitch video |
| `techStack` | String (Optional) | Comma-delimited list of technologies |

---

## 3. Strict Deadline Enforcement Logic

All submission modifications are validated on the backend inside `submissionService.js`:

```javascript
const now = new Date();
const deadline = new Date(team.event.deadline);

if (now > deadline && !isOrganizer) {
  const error = new Error(
    `Submission deadline has passed on ${deadline.toISOString()}. Modifications are strictly prohibited.`
  );
  error.statusCode = 403;
  throw error;
}
```

### Key Rules:
- **No Client Trust**: Even if a user intercepts or manipulates client state, the server rejects late requests with `403 Forbidden`.
- **Pre-Deadline Updates**: Teams can modify their title, description, and links as many times as needed before `event.deadline`.
- **Post-Deadline Lock**: As soon as the deadline is reached, project deliverables become immutable to participants. Organizers retain administrative override capabilities for exceptional accommodations.
