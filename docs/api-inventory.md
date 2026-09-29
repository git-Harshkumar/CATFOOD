# CATFOOD REST API Inventory

## 1. Authentication (`/api/auth`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account |
| `POST` | `/api/auth/login` | Public | Authenticate user and issue JWT |
| `GET` | `/api/auth/me` | Authenticated | Fetch authenticated user profile |

## 2. Events & Management (`/api/events`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | Public | List all public / published events |
| `POST` | `/api/events` | Organizer / Admin | Create a new hackathon event |
| `GET` | `/api/events/:id` | Public | Retrieve detailed event metadata |
| `PUT` | `/api/events/:id` | Organizer / Admin | Update event details & dates |
| `POST` | `/api/events/:id/criteria` | Organizer / Admin | Add scoring criterion |
| `PUT` | `/api/events/:id/criteria/:criterionId` | Organizer / Admin | Update scoring criterion |
| `DELETE` | `/api/events/:id/criteria/:criterionId` | Organizer / Admin | Remove scoring criterion |
| `POST` | `/api/events/:id/judges` | Organizer / Admin | Invite judge with track constraints |
| `GET` | `/api/events/:id/judges` | Organizer / Admin | List appointed judges |
| `POST` | `/api/events/:id/judge-assignments/batch` | Organizer / Admin | Batch assign judges to submissions |
| `POST` | `/api/events/:id/judge-assignments/auto` | Organizer / Admin | Balanced algorithmic judge assignment |
| `DELETE` | `/api/events/:id/judge-assignments/:assignmentId` | Organizer / Admin | Remove single assignment |
| `POST` | `/api/events/:id/judging/normalize` | Organizer / Admin | Execute cross-judge z-score normalization |
| `GET` | `/api/events/:id/audit-logs` | Organizer / Admin | Query event audit log trail |
| `GET` | `/api/events/:id/judging/export.csv` | Organizer / Admin | Export sanitized judging CSV |
| `GET` | `/api/events/:id/certificates` | Organizer / Admin | List all certificates issued for event |

## 3. Teams (`/api/teams`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/teams` | Authenticated | Create a new project team |
| `POST` | `/api/teams/join` | Authenticated | Join team via invite code |
| `GET` | `/api/teams/my-teams` | Authenticated | List teams current user belongs to |
| `GET` | `/api/teams/:id` | Authenticated | View team roster and submission |
| `POST` | `/api/teams/:id/leave` | Member | Leave a team |
| `DELETE`| `/api/teams/:id/members/:userId`| Leader / Organizer | Remove a team member |

## 4. Submissions (`/api/submissions`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/submissions/team/:teamId` | Team Leader | Create or update project submission before deadline |
| `GET` | `/api/submissions/:id` | Public | Retrieve project details |
| `GET` | `/api/submissions/gallery/:eventId`| Public | Fetch submitted projects for event gallery |

## 5. Judging (`/api/judging`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/judging/queue` | Appointed Judge | Retrieve assigned submissions queue |
| `GET` | `/api/judge/scores` | Appointed Judge | View own submitted scores |
| `POST` | `/api/judging/score/:submissionId`| Appointed Judge | Submit rubric scores for assigned project |
| `POST` | `/api/judging/:eventId/pairwise/compare`| Appointed Judge | Record Bradley-Terry pairwise preference |
| `GET` | `/api/judging/:eventId/pairwise/standings`| Public (if unsealed)| Compute Bradley-Terry rankings |
| `GET` | `/api/judging/leaderboard/:eventId`| Public (if unsealed)| View aggregate event leaderboard |

## 6. Community Voting & Comments (`/api/community`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/community/:eventId/vote` | Configurable | Cast quadratic community vote |
| `GET` | `/api/community/:eventId/results` | Public (if unsealed)| View community voting tallies |
| `PATCH`| `/api/community/:eventId/settings` | Organizer / Admin | Update voting mode and result seal |
| `POST` | `/api/community/comments/:submissionId`| Authenticated | Post comment on project |
| `GET` | `/api/community/comments/:submissionId`| Public | List comments on project |
| `DELETE`| `/api/community/comments/:commentId`| Author / Organizer | Soft-delete comment |

## 7. Outbound Webhooks (`/api/webhooks`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/webhooks/:eventId` | Organizer / Admin | Register new webhook endpoint (returns secret once) |
| `GET` | `/api/webhooks/:eventId` | Organizer / Admin | List webhooks for event (secrets masked) |
| `DELETE`| `/api/webhooks/:id` | Organizer / Admin | Remove webhook endpoint |
| `POST` | `/api/webhooks/:eventId/test` | Organizer / Admin | Trigger test delivery payload |
| `GET` | `/api/webhooks/:id/deliveries` | Organizer / Admin | Query delivery logs and retry statuses |

## 8. Certificates & Signed Judge Records (`/api/certificates`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/certificates/:eventId/issue` | Organizer / Admin | Issue verifiable certificate / record |
| `GET` | `/api/certificates` | Authenticated | List certificates issued to current user |
| `GET` | `/api/certificates/verify/:id` | Public | Publicly verify certificate validity |
| `POST` | `/api/certificates/:id/revoke` | Organizer / Admin | Revoke certificate with reason |
| `GET` | `/api/certificates/judge-record/:id` | Public | Fetch canonical Ed25519 judge record & signature |
| `GET` | `/.well-known/signing-keys` | Public | Public keys registry for offline signature verification |

## 9. Embeddable Gallery (`/api/embed`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/embed/gallery/:eventId` | Public | Render standalone HTML embeddable gallery |
| `GET` | `/api/embed/gallery/:eventId/data` | Public | JSON DTO endpoint for headless gallery widgets |
| `GET` | `/embed/gallery.js` | Public | JavaScript embed loader script |
| `GET` | `/api/embed/:eventId/config` | Public | Retrieve embed styling and filter configuration |
| `PUT` | `/api/embed/:eventId/config` | Organizer / Admin | Update embed configuration |

## 10. Bulk Import / Export & Data Portability (`/api/bulk`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bulk/:eventId/import` | Organizer / Admin | Atomic bulk import of projects / judges |
| `POST` | `/api/bulk/:eventId/import/preview` | Organizer / Admin | Validate and preview dataset without mutating |
| `GET` | `/api/bulk/import/:jobId` | Organizer / Admin | Poll async import job progress |
| `GET` | `/api/bulk/:eventId/export` | Organizer / Admin | Export full versioned event bundle JSON |
| `POST` | `/api/bulk/event/import` | Organizer / Admin | Re-import event bundle into new hackathon |
