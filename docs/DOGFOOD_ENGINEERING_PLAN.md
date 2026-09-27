# DOGFOOD HACKATHON 2026 — ENGINEERING PROJECT PLAN

**Prepared for:** Hackathon Raptors  
**Project:** Dogfood — Open-Source Hackathon Submission & Judging Platform  
**Duration:** 72 hours (September 25–28, 2026)  
**Classification:** Production Software Engineering Plan  
**Status:** Pre-Implementation Planning  

---

## EXECUTIVE SUMMARY

Dogfood is not a hackathon feature project. It is a production software engineering effort constrained to a 72-hour completion window.

The challenge is to build a **real platform that Hackathon Raptors can immediately adopt and operate**, complete with:

- Secure, backend-enforced role isolation
- Transparent, defensible judging and normalization
- Community voting with abuse prevention
- Self-hostable, local-first deployment
- Complete documentation and operational readiness

**Success criteria** is not feature count but **correctness, integrity, maintainability, and adoptability**.

A smaller but correct T2 implementation is worth more than a broken T4.

---

## 1. PRODUCT DEFINITION

### 1.1 What We Are Building

A **self-hostable, open-source platform for managing the complete lifecycle of a hackathon event**, from registration through results publication and archival.

The product serves:

1. **Event Organizers** — who create and manage events, assign judges, configure rubrics, monitor progress
2. **Judges** — who score projects according to configurable criteria
3. **Participants** — who register, form teams, and submit projects
4. **Community** — who vote on projects and comment
5. **Admins** — who configure system-wide policies

### 1.2 Problem Statement

Existing hackathon platforms suffer from:

- Weak separation of concerns (judges can see peer scores)
- Opaque score normalization (averaging raw scores is insufficient)
- Vulnerable community voting (no abuse prevention)
- Cloud/hosted dependencies (lock-in, operational complexity)
- Poor data portability (spreadsheet-driven workarounds)
- Limited API coverage (no programmatic access)
- Insufficient documentation (difficult to operate independently)

Dogfood addresses these gaps through:

- **Backend-enforced authorization** at the API level
- **Transparent, documented normalization** with mathematical justification
- **Rate limiting, duplicate detection, and audit trails** for voting
- **Local-first, self-hosted architecture** with no external dependencies
- **Complete data export/import** for portability
- **Comprehensive REST API** for programmatic access
- **Clear operational documentation** for adoption

### 1.3 Event Lifecycle

A complete event progression:

```
DRAFT
  ↓
REGISTRATION_OPEN  (participants register, form teams)
  ↓
REGISTRATION_CLOSED (team formation locked)
  ↓
SUBMISSION_OPEN  (participants submit projects)
  ↓
SUBMISSION_CLOSED  (submissions locked)
  ↓
ELIGIBILITY_REVIEW  (organizers verify submissions)
  ↓
JUDGING  (judges score projects)
  ↓
JUDGING_COMPLETE  (all scoring finished)
  ↓
VOTING  (community votes on projects)
  ↓
VOTING_CLOSED  (ballots locked)
  ↓
RESULTS  (rankings published)
  ↓
CERTIFICATES  (documents issued)
  ↓
ARCHIVED  (event closed)
```

### 1.4 System Boundaries

**Inside:**
- User authentication and session management
- Event lifecycle state machine
- Team and submission management
- Judging interface and score recording
- Judge assignment algorithms
- Score normalization
- Community voting system
- Public gallery and search
- CSV/data export
- REST API
- Audit logging

**Outside:**
- Email delivery (teams send invites, receive notifications via UI)
- Cloud storage (files are base64-embedded or served locally)
- Third-party authentication (LDAP, OAuth)
- Analytics or telemetry
- Video hosting (stored as URLs, not transcoded)
- CDN or edge caching
- AI/ML model serving

### 1.5 Primary Actors & Permissions

| Actor | Registration | Submission | Judging | Voting | Results | Admin |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|
| **Visitor** | View | View | — | Vote* | View | — |
| **Participant** | Create | Create | — | Vote* | View | — |
| **Judge** | View | View | Score | Vote* | View | — |
| **Organizer** | Create | Manage | Manage | View | Publish | Configure |
| **Admin** | All | All | All | All | All | All |

*Voting access depends on event configuration (open link, email-gated, authenticated).

---

## 2. REQUIREMENTS BREAKDOWN

### 2.1 Functional Requirements by Tier

#### **TIER 1 — CORE (Mandatory)**

**T1.1 Authentication**
- User registration (email/password)
- Login/logout
- Session management
- Password reset via email
- No external authentication provider required

**T1.2 Role Management**
- Role assignment (Visitor, Participant, Judge, Organizer, Admin)
- Role-based access control enforced at backend

**T1.3 Event Management**
- Create event (organizer-only)
- Configure event dates (registration open/close, submission open/close, judging window, voting window)
- Configure tracks (categories)
- Configure prizes
- Event state transitions

**T1.4 Team Formation**
- Create team (participant)
- Invite teammates via email link
- Accept/decline invitations
- Team member list
- Team owner can remove members

**T1.5 Project Submission**
- Create submission draft
- Edit submission before deadline
- Submit project (final)
- Prevent edits after submission deadline
- Support fields: name, tagline, description, thumbnail, images, video URL, demo URL, repo URL, tags, track, custom questions

**T1.6 Public Gallery**
- Browse submitted projects
- Search by name/tag
- Filter by track
- View project details
- No authentication required for gallery access

#### **TIER 2 — JUDGING**

**T2.1 Judge Management**
- Invite judges
- Track judge status (invited, accepted, declined)
- Judge dashboard showing assigned projects
- Notification system (in-app; email optional)

**T2.2 Judge Assignment**
- Assign judges to projects manually
- Batch assignment (distributed evenly)
- Ensure judges are assigned to appropriate tracks
- View assignment matrix (organizer only)

**T2.3 Weighted Judging Rubrics**
- Configure scoring criteria with weights (e.g., 40% technical, 25% innovation, 20% usability, 15% impact)
- Weights must sum to 100%
- Support 1-5 or 1-10 scoring scale (configurable)
- Calculate weighted final scores

**T2.4 Judge Dashboard**
- List assigned projects
- Score each project according to rubric
- View scoring progress
- Submit scores
- Prevent modification of submitted scores

**T2.5 Backend Role Isolation**
- Judge A cannot access Judge B's scores (API-enforced)
- Judge cannot access projects outside their assigned track
- Judge cannot see other judges' ballots
- Organizer can see all scores (for normalization)
- Admin can see all data

**T2.6 Organizer Dashboards**
- Judge progress tracking (% complete)
- Judging timeline
- Scoring completion stats
- Score preview (before normalization)

**T2.7 Score Normalization**
- Implement defensible normalization method (e.g., z-score normalization, percentile-based, or Bayesian)
- Document methodology clearly
- Show before/after rankings
- Ensure final rankings are reproducible
- Export normalized scores

**T2.8 CSV Export**
- Export at every major stage: submissions, judge assignments, scores, normalized scores, results
- Consistent formatting
- Include metadata (export date, event, tier)

#### **TIER 3 — PUBLIC FEATURES**

**T3.1 Community Voting**
- Configurable voting modes: open link, email-gated, authenticated users
- One-person-one-vote model (or justify alternative)
- Voting interface with randomized project ordering
- Vote tallying

**T3.2 Voting Integrity**
- Rate limiting (e.g., max 10 votes per hour per IP)
- Duplicate detection (prevent multiple votes from same source)
- Audit trail (log all votes, including timestamp, IP, user)
- Suspicious activity alerts (organizer dashboard)

**T3.3 Hidden Results During Voting**
- Participants cannot see live vote counts during voting window
- Organizers retain admin access to live results
- Results revealed only after voting deadline

**T3.4 Randomized Ballot**
- Projects appear in random order on voting pages
- Different random order for each voter
- Reduces positional bias

**T3.5 Comments**
- Community members can comment on gallery projects
- Threaded comments (optional)
- Moderation (organizers can delete spam)

#### **TIER 4 — STRETCH FEATURES**

**T4.1 REST API**
- Authentication endpoint (login, logout, refresh)
- Event endpoints (CRUD)
- Team endpoints
- Submission endpoints
- Judge assignment endpoints
- Judging endpoints
- Voting endpoints
- Results endpoints
- All endpoints must enforce authorization

**T4.2 Webhooks**
- Event created
- Submission received
- Judging started/completed
- Voting closed
- Results published
- Judge invitation sent

**T4.3 Certificates**
- Generate participation certificates (PDF)
- Include participant name, event, date
- Downloadable by participant

**T4.4 Judge Records**
- Generate judge participation records
- Cryptographically signed (optional but valuable)
- Publicly verifiable
- Include: event, dates served, criteria rubric

**T4.5 Embeddable Gallery**
- Embed gallery widget on external sites
- Configurable display (carousel, grid)
- No auth required for embedding

**T4.6 Bulk Import/Export**
- Export entire event (events, teams, submissions, judges, scores, votes, comments)
- Import from exported file
- Migrate away from platform cleanly

### 2.2 Non-Functional Requirements

**Performance**
- Gallery browsing with 1000+ projects: < 500ms response
- Judging interface: < 200ms response
- Voting submission: < 1s (includes rate-limit check)
- Search indexing: < 1s for typical queries

**Security**
- Passwords hashed (bcrypt, Argon2, or PBKDF2)
- HTTPS enforced in production
- SQL injection prevention (parameterized queries)
- XSS protection (template escaping)
- CSRF tokens on forms
- Rate limiting on login, voting, API
- Audit logging for sensitive actions
- Judge score privacy (backend-enforced)
- No sensitive data in URLs

**Reliability**
- Database transactions for atomic operations
- Graceful error handling (no 500s without logging)
- Seed data ensures reproducibility
- Backup/export strategy documented

**Maintainability**
- Clear separation of concerns (auth, domain, API, storage)
- Consistent code style
- Type-safe where practical
- Minimal dependencies
- Well-organized project structure

**Self-Hostability**
- Single `docker compose up` startup
- No cloud account required
- No external API keys required
- Local filesystem storage (not S3)
- SQLite or PostgreSQL (both supported)
- All data portable

**Operability**
- Comprehensive README
- Setup documentation
- Schema documentation
- API documentation
- Troubleshooting guide
- Seed data generation

### 2.3 Constraints

**Time**
- 72-hour development window (Sept 25 18:00 UTC to Sept 28 18:00 UTC)
- No extensions for major bugs
- Acceptance report required at submission

**Team**
- 1–4 people
- No external hires
- No full-time contractors

**Code**
- Must be written during hackathon window
- Frameworks and libraries allowed
- AI assistants allowed
- Pre-existing projects not allowed (cannot repackage existing open-source platform)

**Deployment**
- Must run on laptop with network disabled
- Docker Compose required
- No cloud dependencies (AWS, Azure, GCP)
- No external database-as-a-service
- No authentication SaaS

**Licensing**
- MIT or Apache-2.0
- Public GitHub repository
- Code must remain open source

**Acceptance**
- Must pass T1 acceptance suite tests
- Tier claims must be honest and verified by acceptance report
- Overclaiming results in point deductions

### 2.4 Acceptance Requirements

Per the official acceptance suite:

**T1 Acceptance Criteria**
- [ ] `docker compose up` brings up a working system
- [ ] System seeds with fixture data
- [ ] Users can register and login
- [ ] Organizer can create event
- [ ] Participants can form teams and submit projects
- [ ] Public gallery displays submitted projects

**T2 Acceptance Criteria**
- [ ] Judge assignment functionality exists
- [ ] Judges can score projects with configurable rubrics
- [ ] Backend prevents Judge A from seeing Judge B's scores (API-tested)
- [ ] Organizer can view normalized scores
- [ ] CSV export includes all required fields

**T3 Acceptance Criteria**
- [ ] Community voting interface works
- [ ] Rate limiting prevents vote spam
- [ ] Results hidden during voting (organizer exception)
- [ ] Vote audit trail available

**T4 Acceptance Criteria**
- [ ] REST API operational
- [ ] API endpoints enforced authorization
- [ ] Webhooks delivered
- [ ] Export/import cycle preserves data integrity

---

## 3. REQUIREMENTS TRACEABILITY MATRIX

| ID | Requirement | Tier | Component | Implementation Phase | Test Type | Documentation |
|----|------------|------|-----------|---------------------|-----------|----------------|
| R1.1 | User registration | T1 | Auth | T1.3 | Unit, Integration | README, API |
| R1.2 | Session management | T1 | Auth | T1.3 | Integration | README, Security |
| R1.3 | Role-based access control | T1 | Auth | T1.4 | Unit, Integration | Security |
| R1.4 | Event creation | T1 | Event | T1.5 | Integration | README, Architecture |
| R1.5 | Event state machine | T1 | Event | T1.5 | Unit, E2E | Architecture |
| R1.6 | Team formation | T1 | Team | T1.6 | Integration | README |
| R1.7 | Project submission | T1 | Submission | T1.7 | Integration, E2E | README, Data Model |
| R1.8 | Deadline enforcement | T1 | Submission | T1.8 | Unit, Integration | Architecture |
| R1.9 | Public gallery | T1 | Gallery | T1.9 | Integration, E2E | README |
| R2.1 | Judge invitation | T2 | Judge | T2.1 | Integration | README |
| R2.2 | Judge assignment | T2 | Judge | T2.2 | Unit, Integration | Judging |
| R2.3 | Weighted rubrics | T2 | Judging | T2.3 | Unit, Integration | Judging |
| R2.4 | Judge scoring interface | T2 | Judging | T2.3 | Integration, E2E | README |
| R2.5 | Judge isolation (API-enforced) | T2 | Authorization | T2.4 | Unit, Integration, Security | Security, Judging |
| R2.6 | Track isolation | T2 | Authorization | T2.4 | Unit, Integration, Security | Security, Judging |
| R2.7 | Organizer progress dashboard | T2 | Dashboard | T2.5 | Integration, E2E | README |
| R2.8 | Score normalization | T2 | Judging | T2.6 | Unit, Integration | Judging |
| R2.9 | CSV export | T2 | Export | T2.7 | Integration | Data Model |
| R3.1 | Community voting | T3 | Voting | T3.1 | Integration, E2E | README |
| R3.2 | Voting rate limiting | T3 | Voting | T3.2 | Unit, Integration, Security | Security |
| R3.3 | Duplicate vote detection | T3 | Voting | T3.2 | Unit, Integration | Security |
| R3.4 | Voting audit trail | T3 | Audit | T3.2 | Integration | Data Model, Security |
| R3.5 | Hidden results during voting | T3 | Voting | T3.3 | Integration | Authorization |
| R3.6 | Randomized ballot | T3 | Voting | T3.4 | Unit | Architecture |
| R3.7 | Comments | T3 | Gallery | T3.5 | Integration | README |
| R4.1 | REST API | T4 | API | T4.1 | Integration, Security | API, Architecture |
| R4.2 | API authorization | T4 | API | T4.1 | Unit, Integration, Security | API, Security |
| R4.3 | Webhooks | T4 | API | T4.2 | Integration | API |
| R4.4 | Certificates | T4 | Export | T4.3 | Integration | README |
| R4.5 | Judge records (signed) | T4 | Export | T4.4 | Integration | Data Model |
| R4.6 | Embeddable gallery | T4 | API | T4.5 | Integration | API |
| R4.7 | Bulk import/export | T4 | Export | T4.6 | Integration | Data Model |

---

## 4. DEVELOPMENT PHILOSOPHY

### 4.1 Incremental Software Engineering

We reject the "build everything first, test at the end" anti-pattern.

Instead:

```
Requirements Analysis
     ↓
Domain Model
     ↓
Architecture & Tech Stack
     ↓
Database Schema
     ↓
Authentication Foundation
     ↓
Authorization Framework (RBAC)
     ↓
T1 — Core (incremental)
     ↓
T1 Freeze & Full Testing
     ↓
T2 — Judging (incremental)
     ↓
T2 Freeze & Full Testing
     ↓
T3 — Public (incremental)
     ↓
T3 Freeze & Full Testing
     ↓
T4 — Stretch (incremental)
     ↓
Integration Testing
     ↓
Security Hardening
     ↓
Acceptance Testing
     ↓
Final Documentation
     ↓
Release
```

### 4.2 Dependency Graph

```
Requirements
     ↓
Domain Model (entities, lifecycle)
     ↓
Schema Design (tables, relationships)
     ↓
Infrastructure (docker, database setup)
     ↓
Authentication (login, sessions)
     ├─→ Basic RBAC (roles, permissions)
     ├─→ Authorization Middleware
     │
T1 — Core Features
     ├─→ Event Management
     ├─→ User Management
     ├─→ Team & Submission
     ├─→ Gallery
     │
T2 — Judging (depends on T1)
     ├─→ Judge Assignment
     ├─→ Scoring & Rubrics
     ├─→ Role Isolation Tests
     ├─→ Normalization
     │
T3 — Public (depends on T1+T2)
     ├─→ Voting Infrastructure
     ├─→ Rate Limiting & Audit
     ├─→ Comments
     │
T4 — Stretch (depends on T1+T2+T3)
     ├─→ REST API
     ├─→ Webhooks
     ├─→ Export/Import
     ├─→ Certificates
     │
Final Phase
     ├─→ Integration Testing
     ├─→ Security Audit
     ├─→ Acceptance Suite
     ├─→ Documentation
```

### 4.3 Quality Gates Between Tiers

A tier is **not complete** until:

1. **All requirements implemented** (no stubbed features)
2. **All tests passing** (unit + integration + acceptance)
3. **Authorization verified** (role isolation tested at API level)
4. **Stable schema** (no major migrations from this tier onward)
5. **Documentation updated** (README reflects tier capabilities)
6. **Seed data supports it** (dev/test data includes this tier's workflows)

**Do not advance to T2 if T1 is unstable.**

**Do not advance to T3 if T2 judging is broken.**

---

## 5. SYSTEM ARCHITECTURE

### 5.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   CLIENT LAYER                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Web UI (React/Vue/SvelteKit)          │   │
│  │  (Gallery, Submit, Judge Dashboard, Voting, Admin) │   │
│  └──────────────────┬──────────────────────────────────┘   │
└───────────────────────┼──────────────────────────────────────┘
                        │ HTTPS
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                   API LAYER                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         REST API (Express/Django/FastAPI)          │   │
│  │  ├─ Auth Endpoints                                 │   │
│  │  ├─ Event Endpoints                                │   │
│  │  ├─ Submission Endpoints                           │   │
│  │  ├─ Judging Endpoints                              │   │
│  │  ├─ Voting Endpoints                               │   │
│  │  └─ Admin Endpoints                                │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                       │
│  ┌──────────────────┴─────────────────────────────────┐   │
│  │         MIDDLEWARE LAYER                           │   │
│  │  ├─ Authentication (session/JWT validation)       │   │
│  │  ├─ Authorization (RBAC enforcement)              │   │
│  │  ├─ Rate Limiting                                  │   │
│  │  ├─ Audit Logging                                  │   │
│  │  └─ Error Handling                                 │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                       │
│  ┌──────────────────┴─────────────────────────────────┐   │
│  │         APPLICATION LAYER                          │   │
│  │  ├─ Domain Services (auth, team, submission, etc) │   │
│  │  ├─ Judging Engine (assignment, scoring)          │   │
│  │  ├─ Normalization Engine                          │   │
│  │  ├─ Voting Engine (rate limit, deduplicate)       │   │
│  │  ├─ Export Engine                                  │   │
│  │  └─ Audit Logger                                   │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                       │
│  ┌──────────────────┴─────────────────────────────────┐   │
│  │         DATA ACCESS LAYER                          │   │
│  │  ├─ ORM (Prisma/SQLAlchemy/TypeORM)               │   │
│  │  ├─ Query Builder                                  │   │
│  │  ├─ Migration Runner                               │   │
│  │  └─ Seed Data Generator                            │   │
│  └──────────────────┬──────────────────────────────────┘   │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PostgreSQL (production) / SQLite (dev/local)      │   │
│  │  ├─ Users, Sessions                                │   │
│  │  ├─ Events, Tracks, Prizes                         │   │
│  │  ├─ Teams, TeamMembers, Invitations                │   │
│  │  ├─ Submissions, SubmissionFields                  │   │
│  │  ├─ Judges, JudgeAssignments                       │   │
│  │  ├─ Rubrics, Criteria                              │   │
│  │  ├─ Scores, NormalizedScores                       │   │
│  │  ├─ Votes, VoteAudit                               │   │
│  │  ├─ Comments                                        │   │
│  │  └─ AuditLog                                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Component Details

**Authentication System**
- Email/password registration
- Bcrypt password hashing
- Session-based or JWT tokens
- Session table with expiry
- Password reset flow (email verification required)

**Authorization Layer**
- Role-based access control (RBAC)
- Permission matrix (role → accessible resources)
- Middleware intercepts all requests
- Enforces authorization at API endpoint level
- Audit trail for permission checks

**Judging Engine**
- Judge assignment algorithm
- Score recording and validation
- Weight calculation
- Z-score or percentile normalization
- Cross-judge consistency detection

**Voting System**
- Vote recording with audit metadata (timestamp, IP, user)
- Rate limiting (Redis or in-memory cache)
- Duplicate detection (by IP, user, cookie)
- Vote tallying
- Result publication control

**Export Engine**
- CSV generation for all major entities
- JSON export for import/migration
- Cert PDF generation
- Data portability verification

### 5.3 Technology Stack Recommendations

**Backend Framework**

**Option A: Node.js + Express (Recommended for speed)**
- Prisma ORM (type-safe, excellent migrations)
- TypeScript (catches bugs early)
- Reason: Fastest development, mature ecosystem, good for REST APIs

**Option B: Python + Django**
- Django ORM + migrations
- Django REST Framework for APIs
- Reason: Excellent built-in auth, form validation, admin interface

**Option C: Python + FastAPI**
- SQLAlchemy ORM
- Pydantic for validation
- Reason: Modern, async-capable, good for APIs

**Recommendation: Node.js + Express + Prisma**

Rationale:
- Single language (TypeScript) for frontend + backend
- Prisma provides type-safe schema and migrations
- Excellent developer tooling
- Fast iteration
- Suitable for 72-hour timeline

**Frontend Framework**

**Option A: React + Vite (Recommended)**
- TypeScript
- Tailwind CSS
- SWR or Tanstack Query for data fetching
- Reason: Fast build, excellent DX, mature ecosystem

**Option B: SvelteKit**
- Full-stack meta-framework
- Excellent DX
- Reason: Simpler mental model, less boilerplate

**Recommendation: React + TypeScript + Vite**

Rationale:
- Largest ecosystem
- Easier hiring/maintenance later
- Excellent tooling
- Familiar to most developers

**Database**

**Development/Testing**
- SQLite (embedded, file-based, no server required)

**Production**
- PostgreSQL (if needed for scale; not required for hackathon)

**Recommendation: SQLite for hackathon, PostgreSQL-compatible schema**

Rationale:
- SQLite has no external dependencies
- Runs on single laptop
- Easy to backup (copy file)
- Schema is compatible with PostgreSQL for future migration

**Session/Cache**
- In-memory store (for hackathon, rate limiting and dedup)
- Upgrade to Redis if needed post-hackathon

**Authentication**
- Bcrypt for password hashing
- Session cookies (httpOnly, Secure flags)
- No external OAuth provider

---

## 6. ARCHITECTURAL DECISIONS

### 6.1 Architecture Decision Records (ADR)

#### **ADR-001: Monolithic Backend vs Microservices**

**Decision:** Monolithic backend

**Context:**
- 72-hour deadline
- Small team (1–4 people)
- Operational simplicity required (self-hosted on laptop)
- High coupling between judging, submission, and voting

**Options:**
1. Monolith (API + business logic + data access in single process)
2. Microservices (auth, judging, voting, export as separate services)

**Chosen:** Monolith

**Why:**
- Faster development
- Single deployment artifact
- Simpler data consistency (transactions)
- Easier debugging
- Meets self-hostability requirement
- Can be refactored later if needed

**Trade-offs:**
- Lower horizontal scalability (acceptable; hackathon is single-event)
- Coupling between domains
- Single point of failure (mitigated by backups)

**Consequences:**
- Can deploy with one Docker container
- Database and API in same deployment
- Transactions simplify score atomicity

---

#### **ADR-002: Database Choice (SQLite vs PostgreSQL)**

**Decision:** SQLite for development, PostgreSQL-compatible schema for portability

**Context:**
- No external services allowed
- Must run on laptop with network disabled
- Operational simplicity critical
- Future adoption by Raptors may require scale

**Options:**
1. SQLite (embedded, file-based)
2. PostgreSQL (requires separate server)
3. MySQL (similar to PostgreSQL)

**Chosen:** SQLite in-process, PostgreSQL schema compatibility

**Why:**
- SQLite is zero-config, embedded
- No separate database process
- File-based backup (copy to new machine)
- Schema is compatible with PostgreSQL (use standard SQL, avoid SQLite-specific syntax)
- Can migrate to PostgreSQL later without schema changes

**Trade-offs:**
- SQLite is not concurrent (acceptable; typical hackathon judges are sequential)
- Fewer advanced features (acceptable for MVP)
- Data file must be persisted as Docker volume

**Consequences:**
- Use ORM that supports both (Prisma, SQLAlchemy)
- Avoid SQLite-specific features
- Must persist data volume in docker-compose.yml

---

#### **ADR-003: Authentication Strategy (Sessions vs JWT)**

**Decision:** Session-based authentication with httpOnly cookies

**Context:**
- No external auth provider
- Simple, secure, widely understood
- Easier to invalidate (important for security)
- Easier for traditional web apps

**Options:**
1. Session cookies (httpOnly, Secure)
2. JWT tokens (stateless, refresh tokens needed)
3. Combined (session + JWT for API clients)

**Chosen:** Session cookies for web, optional JWT for API clients

**Why:**
- Session cookies are simpler (no token refresh logic)
- httpOnly prevents XSS token theft
- Session revocation is immediate
- Easier to invalidate on password change
- Standard web security practice

**Trade-offs:**
- Server-side session storage required
- Less suitable for distributed systems (acceptable; we're monolithic)
- Harder for mobile clients (can add JWT layer later)

**Consequences:**
- Use session middleware (Express session)
- Store sessions in database or in-memory
- Set Secure + SameSite flags on cookies
- Implement session expiry (typically 7 days)

---

#### **ADR-004: Authorization Enforcement (Middleware vs Decorator vs Explicit)**

**Decision:** Middleware + explicit checks in route handlers

**Context:**
- Role isolation is critical (judges cannot see peer scores)
- Enforcement must be backend-only
- Cannot rely on frontend to enforce permissions

**Options:**
1. Middleware-only (check role, not resource ownership)
2. Decorators on endpoints (e.g., @authorize('judge'))
3. Explicit checks in handler (if (user.role !== 'organizer') throw 403)
4. Combined (middleware for basic role, handler for resource ownership)

**Chosen:** Combined approach

**Why:**
- Middleware provides basic role check (fail fast)
- Handler checks resource ownership (e.g., can this judge see this project?)
- Prevents unauthorized access at multiple layers
- Clear in code what is being authorized

**Trade-offs:**
- Slightly more verbose
- Risk of forgetting to check (mitigated by tests)

**Consequences:**
- Write authorization tests for every sensitive endpoint
- Use audit logging to catch authorization failures
- Document authorization model clearly

---

#### **ADR-005: Score Normalization Method**

**Decision:** Z-score normalization with clip to [0, 5] range

**Context:**
- Different judges may use different scoring ranges
- Some judges might give all 5s; others all 3s
- Must be transparent and reproducible

**Options:**
1. Average raw scores (weak; doesn't account for judge bias)
2. Z-score normalization (transforms to mean=0, std=1)
3. Percentile-based (rank by percentile)
4. Bayesian (assumes judge bias distribution)
5. Bradley-Terry (pairwise comparisons)

**Chosen:** Z-score normalization

**Why:**
- Mathematically sound
- Reproducible
- Transparent (can show before/after)
- Handles judge bias (high-scoring or low-scoring judges are normalized)
- Not overly complex (implementable in 72 hours)

**Trade-offs:**
- Assumes normal distribution (reasonable for scores)
- Can create scores outside [1, 5] range (must clip)
- Requires sufficient samples (minimum 2-3 judges per project)

**Consequences:**
- Document formula: `z_score = (x - mean) / std_dev`, then map to [0, 5] range
- Include before/after in CSV export
- Show ranking changes to organizers
- Produce visualization of distribution

---

#### **ADR-006: Voting Abuse Prevention Method**

**Decision:** Multi-layer detection: rate limiting + duplicate detection + audit trail

**Context:**
- Community voting can be manipulated
- Need to catch sybil voting, ballot stuffing
- Must be transparent (organizers can see suspicious activity)

**Options:**
1. Rate limiting only (simple but incomplete)
2. Duplicate detection only (weak)
3. CAPTCHA (adds friction, not suitable for hackathon)
4. Multi-layer (rate limiting + duplicate + audit)
5. Voting from verified email only (strong but high friction)

**Chosen:** Multi-layer approach

**Why:**
- Rate limiting catches rapid-fire voting
- Duplicate detection catches multiple votes from same source
- Audit trail enables investigation
- Transparent to organizers (can see suspicious patterns)
- No friction on legitimate voters

**Trade-offs:**
- More complex than single check
- Requires audit infrastructure

**Consequences:**
- Implement rate limiter: 10 votes per hour per IP
- Track votes by IP, user ID, cookie
- Log all votes in audit table
- Provide organizer dashboard showing suspicious patterns

---

#### **ADR-007: Judge Assignment Algorithm**

**Decision:** Greedy even distribution with track constraint

**Context:**
- Projects need multiple judges
- Judges assigned to specific tracks
- Distribution should be balanced (no judge overloaded)

**Options:**
1. Manual assignment (UI, organizer clicks)
2. Random assignment (simple but unbalanced)
3. Round-robin (balanced but predictable)
4. Greedy even distribution (balanced, respects constraints)
5. Optimization algorithm (most fair but complex)

**Chosen:** Manual + greedy batch algorithm

**Why:**
- Manual UI for small hackathons
- Batch greedy for large-scale events
- Balanced distribution
- Respects track constraints
- Transparent to organizers

**Trade-offs:**
- Not optimal (but good enough)
- Requires at least 3 judges per project (assumption)

**Consequences:**
- Provide manual assignment UI (drag-drop or checkbox)
- Provide batch algorithm: sort projects by current judge count, assign judges in round-robin
- Ensure judges are not assigned outside their track
- Verify all projects have minimum judges assigned

---

#### **ADR-008: Audit Logging Strategy**

**Decision:** Immutable append-only audit log with structured JSON

**Context:**
- Must track sensitive actions (score changes, voting, judge access)
- Organizers need to understand voting patterns
- Must be forensic-grade (tamper-evident)

**Options:**
1. No audit log (risk; cannot investigate issues)
2. Mutable logs (can be altered; not forensic)
3. Immutable append-only (cannot be changed)
4. Database-only (depends on database security)
5. Immutable + cryptographic signatures (blockchain-like, probably overkill)

**Chosen:** Immutable append-only logs with structured JSON

**Why:**
- All actions recorded (login, score change, vote, access)
- Cannot be tampered with (append-only)
- Queryable (JSON structure)
- Transparent to organizers

**Trade-offs:**
- Log storage grows (acceptable)
- More complex (mitigated by ORM)

**Consequences:**
- Create audit_log table with immutable fields
- Log to audit_log on: login, score submission, vote, access to sensitive data
- Include: timestamp, user, action, resource, result, IP/session
- Provide query UI for organizers to explore logs
- Export logs with results

---

#### **ADR-009: Judge Score Immutability**

**Decision:** Scores are final once submitted; cannot be edited by judge

**Context:**
- Audit trail requires immutability
- Prevents after-the-fact manipulation
- Clear audit trail

**Options:**
1. Scores can be edited indefinitely (poor audit trail)
2. Scores locked after submission (immutable)
3. Scores can be edited, with audit trail (complex)

**Chosen:** Scores are final once submitted

**Why:**
- Simplest to implement
- Clearest audit trail
- Prevents accidental/intentional modification

**Trade-offs:**
- Judges cannot correct mistakes (mitigated: require organizer to reset)

**Consequences:**
- Implement score version history (optional): show previous scores if reset
- Provide UI for organizers to reset a judge's scores
- Log all resets

---

#### **ADR-010: Track Isolation Implementation**

**Decision:** Track field on Judge, filtered in queries

**Context:**
- Judges assigned to one or more tracks
- Cannot access projects in other tracks
- Must be enforced at query level

**Options:**
1. Track field on Judge table
2. Separate JudgeTrack join table (flexible)
3. Authorization check in handler (incomplete)

**Chosen:** JudgeTrack join table with query filtering

**Why:**
- Supports judges assigned to multiple tracks
- Easy to query in handler: "projects where judge.tracks contains project.track"
- Flexible for future multi-track scenarios

**Trade-offs:**
- Slightly more complex schema
- Join required in queries

**Consequences:**
- Create JudgeTrack table (judge_id, track_id)
- Filter all project queries by judge's assigned tracks
- Test that judge cannot access other-track projects via direct URL/API

---

### 6.2 Summary of Key Decisions

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| **Architecture** | Monolith | Speed, simplicity, self-hostability |
| **Backend** | Node.js + Express | Fast development, TS throughout |
| **Frontend** | React + TypeScript | Mature, ecosystem, maintainability |
| **Database** | SQLite (dev), PostgreSQL-compatible schema | Zero-config, portable |
| **Auth** | Sessions + httpOnly cookies | Simple, secure, revocable |
| **Authorization** | Middleware + handler checks | Layered, clear, testable |
| **Score Normalization** | Z-score normalization | Transparent, defensible |
| **Vote Abuse Prevention** | Rate limit + duplicate detect + audit | Multi-layer, transparent |
| **Judge Assignment** | Manual + greedy batch algorithm | Balanced, flexible |
| **Audit Logging** | Append-only JSON logs | Immutable, forensic, queryable |
| **Score Finality** | Immutable after submission | Clear audit trail, prevent tampering |
| **Track Isolation** | JudgeTrack join table | Flexible, testable |

---

## 7. DOMAIN MODEL

### 7.1 Core Entities

#### **User**

```
User {
  id: uuid (primary key)
  email: string (unique)
  password_hash: string
  first_name: string
  last_name: string
  role: enum [ADMIN, ORGANIZER, JUDGE, PARTICIPANT, VISITOR]
  created_at: timestamp
  updated_at: timestamp
  deleted_at: timestamp (soft delete)
}
```

**Purpose:** Identity and authentication  
**Lifecycle:** Created on registration, optionally soft-deleted on account closure  
**Authorization:** Users can only modify their own profile; admins can modify any  
**Relationships:** Inverse to Session, TeamMember, JudgeAssignment, Score, Vote

---

#### **Session**

```
Session {
  id: string (primary key)
  user_id: uuid (foreign key → User)
  ip_address: string
  user_agent: string
  expires_at: timestamp
  created_at: timestamp
}
```

**Purpose:** Track user sessions  
**Lifecycle:** Created on login, expired on logout or timeout  
**Authorization:** Users can see only their own sessions (optional feature)  
**Relationships:** Many-to-one with User

---

#### **Event**

```
Event {
  id: uuid (primary key)
  slug: string (unique, auto-generated from name)
  name: string
  description: string
  status: enum [DRAFT, REGISTRATION_OPEN, REGISTRATION_CLOSED, 
                SUBMISSION_OPEN, SUBMISSION_CLOSED, ELIGIBILITY_REVIEW,
                JUDGING, JUDGING_COMPLETE, VOTING, VOTING_CLOSED, 
                RESULTS, CERTIFICATES, ARCHIVED]
  
  # Dates
  registration_start: timestamp
  registration_end: timestamp
  submission_start: timestamp
  submission_end: timestamp
  judging_start: timestamp
  judging_end: timestamp
  voting_start: timestamp
  voting_end: timestamp
  
  # Configuration
  organizer_id: uuid (foreign key → User, creator)
  max_team_size: int (default: 5)
  allow_individual_submissions: bool (default: false)
  allow_community_voting: bool (default: true)
  voting_mode: enum [OPEN_LINK, EMAIL_GATED, AUTHENTICATED]
  
  # Metadata
  created_at: timestamp
  updated_at: timestamp
}
```

**Purpose:** Event container, timeline, configuration  
**Lifecycle:** Created as DRAFT, transitioned through states to ARCHIVED  
**Authorization:** Organizer can create/modify own; admin can modify any; participants can view public  
**Relationships:** One-to-many with Track, Prize, Team, Submission, Judge, Vote

**State Transitions:**
```
DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED → SUBMISSION_OPEN →
SUBMISSION_CLOSED → ELIGIBILITY_REVIEW → JUDGING → JUDGING_COMPLETE →
VOTING → VOTING_CLOSED → RESULTS → CERTIFICATES → ARCHIVED
```

---

#### **Track**

```
Track {
  id: uuid (primary key)
  event_id: uuid (foreign key → Event)
  name: string (e.g., "Best Web App", "Best AI")
  description: string
  position: int (sort order)
  created_at: timestamp
}
```

**Purpose:** Project categories within an event  
**Lifecycle:** Created with event, archived with event  
**Authorization:** Organizer can create/modify; judge sees only assigned tracks  
**Relationships:** Many-to-one with Event, inverse to Submission, Prize, Judge

---

#### **Prize**

```
Prize {
  id: uuid (primary key)
  event_id: uuid (foreign key → Event)
  track_id: uuid (foreign key → Track, nullable)
  rank: int (1st, 2nd, 3rd, etc.)
  title: string (e.g., "Best Overall", "Innovation Prize")
  description: string
  reward: string (e.g., "$500 cash")
  position: int (display order)
  created_at: timestamp
}
```

**Purpose:** Prizes awarded to winning projects  
**Lifecycle:** Created with event  
**Authorization:** Organizer can create; public can view  
**Relationships:** Many-to-one with Event, Track (optional)

---

#### **Team**

```
Team {
  id: uuid (primary key)
  event_id: uuid (foreign key → Event)
  name: string
  owner_id: uuid (foreign key → User)
  description: string
  status: enum [FORMING, COMPLETE, DISBANDED]
  created_at: timestamp
  updated_at: timestamp
}
```

**Purpose:** Group of participants collaborating on a project  
**Lifecycle:** Created during registration, transitioned to COMPLETE, can be DISBANDED  
**Authorization:** Owner can modify; members can see; organizer can view all  
**Relationships:** Many-to-one with Event, inverse to TeamMember, Submission

---

#### **TeamMember**

```
TeamMember {
  id: uuid (primary key)
  team_id: uuid (foreign key → Team)
  user_id: uuid (foreign key → User)
  role: enum [OWNER, MEMBER]
  status: enum [PENDING, ACCEPTED, DECLINED, REMOVED]
  invited_at: timestamp
  accepted_at: timestamp (nullable)
  created_at: timestamp
}
```

**Purpose:** Membership in a team  
**Lifecycle:** Created as PENDING (invitation), transitioned to ACCEPTED or DECLINED  
**Authorization:** Owner can invite/remove; invitee can accept/decline  
**Relationships:** Many-to-one with Team, User

---

#### **Submission**

```
Submission {
  id: uuid (primary key)
  event_id: uuid (foreign key → Event)
  team_id: uuid (foreign key → Team)
  track_id: uuid (foreign key → Track)
  
  name: string
  tagline: string
  description: string (long form)
  thumbnail_url: string (base64 or local path)
  
  # Links
  demo_url: string (optional)
  repository_url: string (optional)
  video_url: string (optional)
  
  # Status
  status: enum [DRAFT, SUBMITTED, DISQUALIFIED, ELIGIBLE]
  submitted_at: timestamp (nullable)
  
  # Metadata
  created_at: timestamp
  updated_at: timestamp
}
```

**Purpose:** A project submission by a team  
**Lifecycle:** DRAFT (editable) → SUBMITTED (locked) → ELIGIBLE (after organizer review) or DISQUALIFIED  
**Authorization:** Team owner/member can edit before deadline; organizer can review/mark eligible  
**Relationships:** Many-to-one with Event, Team, Track; one-to-many with SubmissionField, Comment

---

#### **SubmissionField**

```
SubmissionField {
  id: uuid (primary key)
  submission_id: uuid (foreign key → Submission)
  field_name: string (organizer-defined custom question)
  field_value: string (text, long text, or choice)
  created_at: timestamp
}
```

**Purpose:** Custom answers to organizer-defined questions  
**Lifecycle:** Created with submission, immutable after submission  
**Authorization:** Team can see own; organizer can view all; judges can see if assigned  
**Relationships:** Many-to-one with Submission

---

#### **Judge**

```
Judge {
  id: uuid (primary key)
  event_id: uuid (foreign key → Event)
  user_id: uuid (foreign key → User)
  
  status: enum [INVITED, ACCEPTED, DECLINED, COMPLETED]
  invited_at: timestamp
  accepted_at: timestamp (nullable)
  
  # Judge metadata (used in normalization)
  scoring_bias: float (calculated post-event, for analysis)
  
  created_at: timestamp
}
```

**Purpose:** Judge assignment to an event  
**Lifecycle:** INVITED → ACCEPTED (or DECLINED), then COMPLETED after judging  
**Authorization:** Judge can see only own assignments; organizer can view all  
**Relationships:** Many-to-one with Event, User; one-to-many with JudgeTrack, JudgeAssignment, Score

---

#### **JudgeTrack**

```
JudgeTrack {
  id: uuid (primary key)
  judge_id: uuid (foreign key → Judge)
  track_id: uuid (foreign key → Track)
  created_at: timestamp
}
```

**Purpose:** Which tracks a judge is assigned to  
**Lifecycle:** Created when judge is invited; used to filter accessible projects  
**Authorization:** Used in query filtering  
**Relationships:** Many-to-one with Judge, Track

---

#### **Rubric**

```
Rubric {
  id: uuid (primary key)
  event_id: uuid (foreign key → Event)
  name: string (e.g., "Default Rubric")
  description: string
  scale_min: int (1 or 0)
  scale_max: int (5 or 10)
  created_at: timestamp
}
```

**Purpose:** Define scoring criteria and weights  
**Lifecycle:** Created before judging; immutable after judging starts  
**Authorization:** Organizer can create/modify; judge can view; public cannot see  
**Relationships:** Many-to-one with Event; one-to-many with Criterion

---

#### **Criterion**

```
Criterion {
  id: uuid (primary key)
  rubric_id: uuid (foreign key → Rubric)
  name: string (e.g., "Technical Implementation", "Innovation")
  description: string
  weight: float (e.g., 0.40 for 40%)
  position: int (sort order)
  created_at: timestamp
}
```

**Purpose:** Individual scoring category within a rubric  
**Lifecycle:** Created with rubric  
**Authorization:** Organizer can create/modify; judge can see when scoring  
**Relationships:** Many-to-one with Rubric; one-to-many with Score

---

#### **JudgeAssignment**

```
JudgeAssignment {
  id: uuid (primary key)
  judge_id: uuid (foreign key → Judge)
  submission_id: uuid (foreign key → Submission)
  
  assigned_at: timestamp
  status: enum [PENDING, STARTED, COMPLETED]
  started_at: timestamp (nullable)
  completed_at: timestamp (nullable)
  
  created_at: timestamp
}
```

**Purpose:** Assign judge to project  
**Lifecycle:** PENDING (assigned) → STARTED (judge opens) → COMPLETED (judge submits)  
**Authorization:** Judge can see own assignments; organizer can view all  
**Relationships:** Many-to-one with Judge, Submission

---

#### **Score**

```
Score {
  id: uuid (primary key)
  judge_id: uuid (foreign key → Judge)
  submission_id: uuid (foreign key → Submission)
  criterion_id: uuid (foreign key → Criterion)
  
  score: int (1-5, 1-10, etc., per rubric)
  comment: string (optional judge commentary)
  
  # Immutability
  submitted_at: timestamp (once set, score is final)
  
  # Normalization (calculated post-judging)
  normalized_score: float (nullable, calculated)
  
  created_at: timestamp
}
```

**Purpose:** Judge's score for a submission on a criterion  
**Lifecycle:** Created when judge submits; immutable after submission  
**Authorization:** Judge can see own; organizer can see all; other judges cannot see peer scores  
**Relationships:** Many-to-one with Judge, Submission, Criterion

---

#### **NormalizedScore**

```
NormalizedScore {
  id: uuid (primary key)
  submission_id: uuid (foreign key → Submission)
  
  # Raw aggregation
  raw_average: float
  raw_std_dev: float
  raw_rank: int
  
  # Normalized aggregation
  normalized_average: float
  normalized_std_dev: float
  normalized_rank: int
  
  # Metadata
  judge_count: int
  normalization_method: string (e.g., "z-score")
  calculated_at: timestamp
  
  created_at: timestamp
}
```

**Purpose:** Final aggregated and normalized scores  
**Lifecycle:** Calculated once after all judges submit  
**Authorization:** Organizer can view; results published to public based on event config  
**Relationships:** Many-to-one with Submission

---

#### **Vote**

```
Vote {
  id: uuid (primary key)
  event_id: uuid (foreign key → Event)
  submission_id: uuid (foreign key → Submission)
  
  # Voter identification
  voter_id: uuid (foreign key → User, nullable if anonymous)
  voter_email: string (nullable, for email-gated voting)
  
  # Metadata
  ip_address: string
  user_agent: string
  voted_at: timestamp
  
  created_at: timestamp
}
```

**Purpose:** Community vote on project  
**Lifecycle:** Created when vote is cast; immutable  
**Authorization:** Anyone can vote if event allows; organizer can see all  
**Relationships:** Many-to-one with Event, Submission, User (nullable)

---

#### **VoteAudit**

```
VoteAudit {
  id: uuid (primary key)
  event_id: uuid (foreign key → Event)
  
  # Detection
  detection_type: enum [RATE_LIMIT, DUPLICATE, SUSPICIOUS]
  severity: enum [LOW, MEDIUM, HIGH]
  
  # Details
  ip_address: string
  user_agent: string
  voter_id: uuid (nullable)
  message: string (e.g., "5 votes from same IP in 10 minutes")
  
  # Resolution
  status: enum [NEW, REVIEWED, DISMISSED, ACTION_TAKEN]
  organizer_notes: string (nullable)
  
  detected_at: timestamp
  reviewed_at: timestamp (nullable)
  created_at: timestamp
}
```

**Purpose:** Track suspicious voting activity  
**Lifecycle:** Detected automatically; reviewed manually by organizer  
**Authorization:** Organizer only  
**Relationships:** Many-to-one with Event

---

#### **Comment**

```
Comment {
  id: uuid (primary key)
  submission_id: uuid (foreign key → Submission)
  user_id: uuid (foreign key → User)
  
  content: string
  parent_comment_id: uuid (nullable, for threading)
  
  status: enum [PUBLISHED, MODERATED, DELETED]
  
  created_at: timestamp
  updated_at: timestamp
  deleted_at: timestamp (soft delete)
}
```

**Purpose:** Community feedback on submissions  
**Lifecycle:** Published → moderated/deleted if inappropriate  
**Authorization:** Authors can delete own; organizer can moderate  
**Relationships:** Many-to-one with Submission, User; self-referential for threading

---

#### **Certificate**

```
Certificate {
  id: uuid (primary key)
  event_id: uuid (foreign key → Event)
  recipient_name: string
  certificate_type: enum [PARTICIPANT, JUDGE, WINNER]
  rank: int (nullable, only for winner)
  pdf_url: string (path to generated PDF)
  
  issued_at: timestamp
  created_at: timestamp
}
```

**Purpose:** Digital certificates for participants and judges  
**Lifecycle:** Generated after event completion  
**Authorization:** Recipient can download own; organizer can view all  
**Relationships:** Many-to-one with Event

---

#### **AuditLog**

```
AuditLog {
  id: uuid (primary key)
  
  # Subject
  user_id: uuid (nullable, for anonymous actions)
  ip_address: string
  session_id: string (nullable)
  
  # Action
  action: string (e.g., "LOGIN", "SUBMIT_SCORE", "VOTE", "DELETE_COMMENT")
  resource_type: string (e.g., "Submission", "Score", "Vote")
  resource_id: uuid (nullable)
  
  # Details
  details: json (arbitrary context)
  result: enum [SUCCESS, FAILURE]
  error_message: string (nullable)
  
  # Metadata
  timestamp: timestamp
  created_at: timestamp
}
```

**Purpose:** Immutable audit trail  
**Lifecycle:** Append-only; never modified  
**Authorization:** Organizer and admin can view; never deleted  
**Relationships:** No foreign keys (immutable reference)

---

### 7.2 Entity Relationships Diagram

```
User ──→ Session
  ├→ TeamMember ──→ Team ──→ Event
  ├→ JudgeAssignment ──→ Judge ──→ Event
  ├→ Score ──→ Submission ──→ Team
  ├→ Vote ──→ Submission
  ├→ Comment ──→ Submission
  └─ AuditLog

Event ──→ Track ──→ Prize
  ├→ Team ──→ Submission ──→ SubmissionField
  ├→ Judge ──→ JudgeTrack ──→ Track
  ├→ Judge ──→ JudgeAssignment ──→ Submission
  ├→ Rubric ──→ Criterion ──→ Score ──→ Submission
  ├→ Vote ──→ Submission
  ├→ VoteAudit
  └─ Certificate
```

---

## 8. DATABASE DESIGN

### 8.1 Logical Schema (SQL DDL)

```sql
-- Users & Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'VISITOR',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  
  registration_start TIMESTAMP,
  registration_end TIMESTAMP,
  submission_start TIMESTAMP,
  submission_end TIMESTAMP,
  judging_start TIMESTAMP,
  judging_end TIMESTAMP,
  voting_start TIMESTAMP,
  voting_end TIMESTAMP,
  
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  max_team_size INTEGER DEFAULT 5,
  allow_individual_submissions BOOLEAN DEFAULT FALSE,
  allow_community_voting BOOLEAN DEFAULT TRUE,
  voting_mode VARCHAR(50) DEFAULT 'OPEN_LINK',
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_organizer_id ON events(organizer_id);

CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  position INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tracks_event_id ON tracks(event_id);

CREATE TABLE prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
  rank INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reward VARCHAR(255),
  position INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_prizes_event_id ON prizes(event_id);
CREATE INDEX idx_prizes_track_id ON prizes(track_id);

-- Teams & Submissions
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'FORMING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_teams_event_id ON teams(event_id);
CREATE INDEX idx_teams_owner_id ON teams(owner_id);

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  invited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_team_members_unique ON team_members(team_id, user_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE RESTRICT,
  
  name VARCHAR(255) NOT NULL,
  tagline VARCHAR(500),
  description TEXT,
  thumbnail_url TEXT,
  
  demo_url VARCHAR(500),
  repository_url VARCHAR(500),
  video_url VARCHAR(500),
  
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  submitted_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_submissions_event_id ON submissions(event_id);
CREATE INDEX idx_submissions_team_id ON submissions(team_id);
CREATE INDEX idx_submissions_track_id ON submissions(track_id);
CREATE INDEX idx_submissions_status ON submissions(status);

CREATE TABLE submission_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  field_value TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_submission_fields_submission_id ON submission_fields(submission_id);

-- Judging
CREATE TABLE judges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  status VARCHAR(50) NOT NULL DEFAULT 'INVITED',
  invited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  
  scoring_bias NUMERIC(5, 3),
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_judges_event_user ON judges(event_id, user_id);
CREATE INDEX idx_judges_status ON judges(status);

CREATE TABLE judge_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_judge_tracks_unique ON judge_tracks(judge_id, track_id);

CREATE TABLE rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  scale_min INTEGER DEFAULT 1,
  scale_max INTEGER DEFAULT 5,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_rubrics_event_id ON rubrics(event_id);

CREATE TABLE criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  weight NUMERIC(5, 3) NOT NULL,
  position INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_criteria_rubric_id ON criteria(rubric_id);

CREATE TABLE judge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_judge_assignments_unique ON judge_assignments(judge_id, submission_id);
CREATE INDEX idx_judge_assignments_status ON judge_assignments(status);

CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES criteria(id) ON DELETE RESTRICT,
  
  score INTEGER NOT NULL,
  comment TEXT,
  
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  normalized_score NUMERIC(5, 3),
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_scores_unique ON scores(judge_id, submission_id, criterion_id);
CREATE INDEX idx_scores_submission_id ON scores(submission_id);
CREATE INDEX idx_scores_judge_id ON scores(judge_id);

CREATE TABLE normalized_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  
  raw_average NUMERIC(5, 3),
  raw_std_dev NUMERIC(5, 3),
  raw_rank INTEGER,
  
  normalized_average NUMERIC(5, 3),
  normalized_std_dev NUMERIC(5, 3),
  normalized_rank INTEGER,
  
  judge_count INTEGER,
  normalization_method VARCHAR(100),
  calculated_at TIMESTAMP NOT NULL,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_normalized_scores_rank ON normalized_scores(normalized_rank);

-- Voting
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  
  voter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  voter_email VARCHAR(255),
  
  ip_address VARCHAR(45),
  user_agent TEXT,
  voted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_votes_event_id ON votes(event_id);
CREATE INDEX idx_votes_submission_id ON votes(submission_id);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_votes_ip_address ON votes(ip_address);

CREATE TABLE vote_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  detection_type VARCHAR(50) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  
  ip_address VARCHAR(45),
  user_agent TEXT,
  voter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT,
  
  status VARCHAR(50) NOT NULL DEFAULT 'NEW',
  organizer_notes TEXT,
  
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_vote_audits_event_id ON vote_audits(event_id);
CREATE INDEX idx_vote_audits_status ON vote_audits(status);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  status VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED',
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
CREATE INDEX idx_comments_submission_id ON comments(submission_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);

-- Certificates
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  recipient_name VARCHAR(255) NOT NULL,
  certificate_type VARCHAR(50) NOT NULL,
  rank INTEGER,
  pdf_url TEXT,
  
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_certificates_event_id ON certificates(event_id);

-- Audit Logging (immutable)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  session_id VARCHAR(255),
  
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  
  details JSONB,
  result VARCHAR(50) NOT NULL,
  error_message TEXT,
  
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

### 8.2 Key Constraints & Integrity

**Unique Constraints**
- `users(email)` — prevent duplicate registrations
- `events(slug)` — prevent duplicate event URLs
- `team_members(team_id, user_id)` — prevent duplicate team membership
- `judges(event_id, user_id)` — one judge role per user per event
- `judge_tracks(judge_id, track_id)` — prevent duplicate track assignment
- `judge_assignments(judge_id, submission_id)` — prevent duplicate assignment
- `scores(judge_id, submission_id, criterion_id)` — one score per criterion per judge

**Foreign Key Constraints**
- Cascade deletes on: sessions, team_members, teams, submissions, judges, judge_assignments, scores, votes, comments, certificates (event deletion removes all)
- Restrict deletes on: organizer_id (user), judge.user_id (user), owner_id (user) to prevent orphaning

**Nullable Fields**
- `sessions.session_id` — tracks optional
- `teams.description` — optional
- `submissions.thumbnail_url`, demo_url, repo_url, video_url — optional
- `judges.accepted_at`, scoring_bias — calculated
- `judge_assignments.started_at`, completed_at — calculated
- `scores.comment` — optional
- `votes.voter_id` — nullable for anonymous voting
- `vote_audits.organizer_notes` — optional review notes
- `comments.parent_comment_id` — optional for threading
- `certificates.rank` — only for winner certs

**State/Status Fields** (enforce via application, not DB)
- `events.status` — application must enforce valid transitions
- `submissions.status` — application must enforce deadline-based transitions
- `judges.status` — application manages lifecycle
- `judge_assignments.status` — application tracks progress
- `votes.status` (implicit) — immutable after creation

**Immutable Records**
- `audit_logs` — append-only, never updated
- `scores` — once `submitted_at` is set, cannot be modified (soft constraint in app)
- `votes` — immutable after creation

---

### 8.3 Indexing Strategy

**High-Priority Indexes** (for common queries)
- `users(email)` — login queries
- `events(slug, status)` — event lookups
- `submissions(event_id, track_id, status)` — filtering submissions
- `judges(event_id, status)` — judge progress queries
- `judge_assignments(judge_id, status)` — judge's pending work
- `scores(submission_id, judge_id)` — score aggregation
- `votes(event_id, submission_id, ip_address, voter_id)` — vote deduplication & rate limiting
- `audit_logs(user_id, action, timestamp)` — forensic queries

**Avoid Over-Indexing**
- Skip indexes on low-cardinality fields (e.g., `role`, `status`) unless regularly filtered
- Monitor index usage post-launch

---

## 9. STATE MACHINES

### 9.1 Event Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                       DRAFT                                  │
│  (Initial state, organizer configures)                      │
└────────────┬────────────────────────────────────────────────┘
             │ organizer.publish_registration()
             ↓
┌─────────────────────────────────────────────────────────────┐
│                  REGISTRATION_OPEN                           │
│  (Participants can register and form teams)                 │
│  Valid transition: registration_end timestamp reached       │
└────────────┬────────────────────────────────────────────────┘
             │ auto_transition(now >= registration_end)
             ↓
┌─────────────────────────────────────────────────────────────┐
│                REGISTRATION_CLOSED                           │
│  (New teams cannot form; existing teams locked)             │
│  Valid transition: submission_start timestamp reached       │
└────────────┬────────────────────────────────────────────────┘
             │ auto_transition(now >= submission_start)
             ↓
┌─────────────────────────────────────────────────────────────┐
│                   SUBMISSION_OPEN                            │
│  (Teams can submit; drafts locked)                          │
│  Valid transition: submission_end timestamp reached         │
└────────────┬────────────────────────────────────────────────┘
             │ auto_transition(now >= submission_end)
             ↓
┌─────────────────────────────────────────────────────────────┐
│                SUBMISSION_CLOSED                             │
│  (No new submissions; organizer reviews)                    │
│  Valid transition: organizer.start_eligibility_review()     │
└────────────┬────────────────────────────────────────────────┘
             │ organizer.start_eligibility_review()
             ↓
┌─────────────────────────────────────────────────────────────┐
│               ELIGIBILITY_REVIEW                             │
│  (Organizer marks projects eligible/disqualified)          │
│  Valid transition: organizer.start_judging()                │
└────────────┬────────────────────────────────────────────────┘
             │ organizer.start_judging()
             ↓
┌─────────────────────────────────────────────────────────────┐
│                    JUDGING                                   │
│  (Judges submit scores; results hidden)                     │
│  Valid transition: judging_end timestamp or complete all    │
└────────────┬────────────────────────────────────────────────┘
             │ auto_transition(all judges complete) or manual
             ↓
┌─────────────────────────────────────────────────────────────┐
│               JUDGING_COMPLETE                               │
│  (Scores normalized; ready for voting)                      │
│  Valid transition: organizer.start_voting()                 │
└────────────┬────────────────────────────────────────────────┘
             │ organizer.start_voting()
             ↓
┌─────────────────────────────────────────────────────────────┐
│                    VOTING                                    │
│  (Community votes; results hidden)                          │
│  Valid transition: voting_end timestamp reached             │
└────────────┬────────────────────────────────────────────────┘
             │ auto_transition(now >= voting_end)
             ↓
┌─────────────────────────────────────────────────────────────┐
│               VOTING_CLOSED                                  │
│  (Votes tallied; ready for publication)                     │
│  Valid transition: organizer.publish_results()              │
└────────────┬────────────────────────────────────────────────┘
             │ organizer.publish_results()
             ↓
┌─────────────────────────────────────────────────────────────┐
│                    RESULTS                                   │
│  (Final rankings visible; ready for certificates)          │
│  Valid transition: organizer.issue_certificates()           │
└────────────┬────────────────────────────────────────────────┘
             │ organizer.issue_certificates()
             ↓
┌─────────────────────────────────────────────────────────────┐
│               CERTIFICATES                                   │
│  (Certs issued; event winding down)                         │
│  Valid transition: organizer.archive_event()                │
└────────────┬────────────────────────────────────────────────┘
             │ organizer.archive_event()
             ↓
┌─────────────────────────────────────────────────────────────┐
│                   ARCHIVED                                   │
│  (Event frozen; read-only; data preserved)                  │
└─────────────────────────────────────────────────────────────┘
```

**Invalid Transitions**
- Cannot skip states (must progress linearly)
- Cannot revert (ARCHIVED is terminal)
- Cannot transition before timestamp if auto-triggered

**Enforcement**
- Application validates state before action
- Database constraint: status field limited to enum values
- Audit log: every state change logged

---

### 9.2 Submission Lifecycle

```
┌──────────────────────────────┐
│          DRAFT               │
│  (Editable by team)          │
└────────┬─────────────────────┘
         │ team.submit()
         │ (before submission_end)
         ↓
┌──────────────────────────────┐
│        SUBMITTED             │
│  (Locked; awaiting review)   │
└────────┬──────────────────────┘
         │ organizer.review()
         ├──→ organizer.mark_eligible() ──→ ELIGIBLE
         └──→ organizer.disqualify()  ──→ DISQUALIFIED
```

**Deadline Enforcement**
- After `submission_end` timestamp: `DRAFT` → `SUBMITTED` transition blocked
- Editing locked after submission (application check)

**Invalid Transitions**
- Cannot edit after submitted
- Cannot unsubmit
- Cannot transition from DISQUALIFIED

---

### 9.3 Judge Assignment Lifecycle

```
┌──────────────────────────────┐
│         PENDING              │
│  (Judge invited; awaiting    │
│   acceptance)                │
└────────┬──────────────────────┘
         │ judge.accept()
         ↓
┌──────────────────────────────┐
│        STARTED               │
│  (Judge opened assignment)   │
└────────┬──────────────────────┘
         │ judge.submit_scores()
         ↓
┌──────────────────────────────┐
│       COMPLETED              │
│  (Judge finished scoring)    │
└──────────────────────────────┘
```

---

### 9.4 Voting Access Control

During `VOTING` state:
- **Participants**: Cannot see live vote totals (results hidden)
- **Judges**: Can vote (treated as participants)
- **Organizers**: Can see live vote totals in admin dashboard
- **Visitors**: Can vote if voting_mode allows

During `RESULTS` state:
- **All**: Can see final vote totals

---

## 10. SECURITY ARCHITECTURE

### 10.1 Authentication

**Implementation**
- Passwords hashed with Bcrypt (12 rounds minimum) or Argon2
- Email verification on registration (optional but recommended)
- Sessions stored in database with secure cookie flags

```
Registration Request
  ↓
Validate email/password
  ↓
Hash password
  ↓
Create user record
  ↓
Send verification email (optional)
  ↓
User confirmed
```

**Session Management**
- Session ID: 32-byte random token
- Stored in database with user_id, expires_at, ip_address, user_agent
- Cookie flags: `HttpOnly=true`, `Secure=true` (HTTPS), `SameSite=Strict`
- Session expiry: 7 days for most users; 1 day for judges (security)
- Session invalidation on logout: delete from database

**Password Reset**
- User requests reset via email
- Generate one-time reset token (valid 1 hour)
- Email link with token
- User sets new password
- Token invalidated

---

### 10.2 Authorization (RBAC)

**Role Hierarchy**

```
ADMIN
  ├─ All permissions
  └─ System-wide access

ORGANIZER
  ├─ Create/edit own events
  ├─ Invite judges
  ├─ Configure rubrics
  ├─ View all scores (own event)
  ├─ Publish results
  └─ Issue certificates

JUDGE
  ├─ Accept/decline invitations
  ├─ View assigned projects
  ├─ Submit scores
  └─ View own scores (NOT peers)

PARTICIPANT
  ├─ Create teams
  ├─ Invite teammates
  ├─ Submit projects
  └─ View own submissions

VISITOR
  └─ View public gallery
  └─ Vote (if enabled)
```

**Permission Matrix**

| Resource | ADMIN | ORG | JUDGE | PARTICIPANT | VISITOR |
|----------|:---:|:---:|:---:|:---:|:---:|
| Create Event | ✓ | ✓ | — | — | — |
| Manage Event | ✓ | own | — | — | — |
| Invite Judge | ✓ | own | — | — | — |
| View Scores (own judge) | ✓ | own | ✓ | — | — |
| View Scores (peer judge) | ✓ | own | ✗ | — | — |
| View Scores (all) | ✓ | own | — | — | — |
| Publish Results | ✓ | own | — | — | — |
| Create Submission | ✓ | — | ✓ | ✓ | — |
| Edit Submission (before deadline) | ✓ | — | ✓ | ✓ | — |
| Vote | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Public Gallery | ✓ | ✓ | ✓ | ✓ | ✓ |

**Enforcement Mechanism**

Every API endpoint enforces authorization:

```javascript
// Example: GET /api/submissions/:id
async function getSubmission(req, res) {
  const submission = await db.submission.findUnique({ id: req.params.id });
  
  // Authorization check
  const authorized =
    req.user.role === 'ADMIN' ||
    (req.user.role === 'ORGANIZER' && submission.event.organizer_id === req.user.id) ||
    (req.user.role === 'JUDGE' && canJudgeAccessSubmission(req.user, submission)) ||
    (req.user.role === 'PARTICIPANT' && submission.team.owner_id === req.user.id) ||
    (submission.status === 'ELIGIBLE' && req.user.role === 'VISITOR');
  
  if (!authorized) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  res.json(submission);
}
```

---

### 10.3 Judge Isolation

**Backend Enforcement (Critical)**

Judge A must NOT be able to access Judge B's scores via:
1. Direct API call
2. URL manipulation
3. ID guessing
4. Authorization bypass

**Implementation**

```javascript
// Check 1: Verify judge owns this score
const score = await db.score.findUnique({ id: scoreId });
if (score.judge_id !== req.user.judge.id) {
  return res.status(403).json({ error: 'Forbidden' });
}

// Check 2: Verify judge is assigned to this project
const assignment = await db.judgeAssignment.findUnique({
  judge_id: req.user.judge.id,
  submission_id: score.submission_id
});
if (!assignment) {
  return res.status(403).json({ error: 'Forbidden' });
}

// Check 3: Verify judge is assigned to the project's track
const isInTrack = await db.judgeTrack.findUnique({
  judge_id: req.user.judge.id,
  track_id: score.submission.track_id
});
if (!isInTrack) {
  return res.status(403).json({ error: 'Forbidden' });
}

// ✓ All checks pass; allow access
```

**API Endpoints Requiring Judge Isolation**
- `GET /api/judges/:id/scores` — only own scores
- `GET /api/judges/:id/assignments` — only own assignments
- `GET /api/scores/:id` — only own scores
- `PATCH /api/scores/:id` — only own scores (prevent edit after submit)

**Test Cases**
- Judge A tries to access Judge B's score → 403 Forbidden
- Judge A tries to access submission outside their track → 403 Forbidden
- Judge tries to modify peer's score → 403 Forbidden
- Judge tries to list all scores → 403 Forbidden (shows only own)

---

### 10.4 Track Isolation

**Implementation**

```javascript
// When fetching projects for a judge
const projects = await db.submission.findMany({
  where: {
    track: {
      judgeTrack: {
        some: { judge_id: req.user.judge.id }
      }
    }
  }
});
```

**Test**
- Judge assigned to Track A tries to score project in Track B → 403 Forbidden

---

### 10.5 Voting Security

**Rate Limiting**

```javascript
// Check rate limit: max 10 votes per hour per IP
const recentVotes = await db.vote.count({
  where: {
    ip_address: req.ip,
    voted_at: { gte: Date.now() - 3600000 } // last hour
  }
});

if (recentVotes >= 10) {
  audit.logSuspiciousActivity('RATE_LIMIT', req.ip, 'Too many votes');
  return res.status(429).json({ error: 'Rate limited' });
}
```

**Duplicate Detection**

```javascript
// Check if this voter already voted on this submission
const existingVote = await db.vote.findFirst({
  where: {
    submission_id: req.body.submission_id,
    [req.user ? 'voter_id' : 'ip_address']: req.user ? req.user.id : req.ip
  }
});

if (existingVote) {
  audit.logSuspiciousActivity('DUPLICATE', req.ip, 'Duplicate vote attempt');
  return res.status(400).json({ error: 'Already voted' });
}
```

**Audit Trail**

```javascript
// Log every vote
await db.vote.create({
  event_id: eventId,
  submission_id: submissionId,
  voter_id: req.user?.id,
  voter_email: req.body.email,
  ip_address: req.ip,
  user_agent: req.headers['user-agent'],
  voted_at: new Date()
});

// Log suspicious activity
if (suspiciousPattern(req.ip, req.user?.id)) {
  await db.voteAudit.create({
    event_id: eventId,
    detection_type: 'SUSPICIOUS',
    severity: 'HIGH',
    ip_address: req.ip,
    voter_id: req.user?.id,
    message: 'Voting pattern suggests coordinated activity'
  });
}
```

---

### 10.6 Submission Security

**Deadline Enforcement**

```javascript
// Before allowing edit
const event = await db.event.findUnique({ id: submission.event_id });
if (new Date() > event.submission_end) {
  return res.status(400).json({ error: 'Submission deadline passed' });
}

// Before allowing submit
if (new Date() > event.submission_end) {
  return res.status(400).json({ error: 'Submission deadline passed' });
}
```

**Ownership Verification**

```javascript
// Only team members can edit their submission
const teamMember = await db.teamMember.findFirst({
  where: {
    team_id: submission.team_id,
    user_id: req.user.id
  }
});

if (!teamMember) {
  return res.status(403).json({ error: 'Not a team member' });
}
```

**URL Validation**

```javascript
// Validate URLs are actually URLs
if (submission.repository_url) {
  if (!submission.repository_url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid repository URL' });
  }
}
```

---

### 10.7 Audit Logging

Every sensitive action logged:

```javascript
await db.auditLog.create({
  user_id: req.user?.id,
  ip_address: req.ip,
  session_id: req.sessionID,
  action: 'SUBMIT_SCORE',
  resource_type: 'Score',
  resource_id: score.id,
  details: {
    judge_id: score.judge_id,
    submission_id: score.submission_id,
    score: score.score
  },
  result: 'SUCCESS'
});
```

**Audited Actions**
- LOGIN / LOGOUT
- REGISTER
- CHANGE_PASSWORD
- INVITE_JUDGE
- ACCEPT_JUDGE_INVITATION
- SUBMIT_SCORE
- VOTE
- EDIT_SUBMISSION (after deadline)
- DELETE_COMMENT
- PUBLISH_RESULTS
- ACCESS_SENSITIVE_DATA (attempted authorization failures)

---

## 11. T1 IMPLEMENTATION PLAN (Core Features)

T1 is the foundation. Do not advance to T2 until T1 is solid.

### T1 Phase Breakdown

#### **T1.0: Foundation & Infrastructure** (6-8 hours)

**Objective:** Set up project structure, database, authentication middleware

**Backend Work**
- Initialize Node.js + Express + TypeScript project
- Set up Prisma with SQLite/PostgreSQL
- Create database schema (users, sessions, events, tracks, teams, submissions tables)
- Implement session middleware (express-session or custom)
- Implement authentication routes (register, login, logout)
- Implement password hashing (bcrypt)
- Create authorization middleware (role-based)

**Frontend Work**
- Initialize React + TypeScript + Vite
- Set up Tailwind CSS
- Create basic layout (header, nav, content area)
- Create authentication pages (login, register)

**Database**
- SQLite with schema from Section 8.1
- Seed script for development

**Tests**
- Unit test: password hashing
- Unit test: session creation
- Integration test: register → login flow
- Integration test: authorization middleware blocks unauthorized access

**Definition of Done**
- `docker compose up` brings up working system
- Can register new user
- Can login with credentials
- Can logout
- Sessions persist across requests
- Unauthorized access blocked at middleware

---

#### **T1.1: Event Management** (4-6 hours)

**Objective:** Create, configure, and navigate events

**Backend Work**
- Event CRUD endpoints
- Event state machine (DRAFT → REGISTRATION_OPEN transition)
- Track creation/editing
- Event permission checks (organizer-only)
- Event listing (organizers see own, visitors see public)

**Frontend Work**
- Event creation form (name, description, dates, tracks, prizes)
- Event detail page
- Organizer dashboard (event list)

**Database**
- No schema changes (already present)

**Tests**
- Test event creation (organizer only)
- Test state transitions
- Test track addition
- Test event listing (only own for organizer)

**Definition of Done**
- Organizer can create event
- Can configure tracks and prizes
- Can see event in dashboard
- Visitor can see public event page

---

#### **T1.2: Team Formation** (4-5 hours)

**Objective:** Enable team creation and member invitations

**Backend Work**
- Team CRUD endpoints
- Team member invitation system (generate invite link)
- Accept/decline invitation
- Team member list
- Team owner can remove members
- Prevent team changes after registration deadline

**Frontend Work**
- Team creation form
- Team list page
- Team detail page (members, owner actions)
- Invite form (generate link)
- Accept/decline invite flow

**Database**
- No schema changes (already present)

**Tests**
- Test team creation
- Test invitation flow
- Test member acceptance
- Test deadline enforcement
- Test duplicate invitations prevented

**Definition of Done**
- Participant can create team
- Can invite teammates via email
- Can view team members
- Invitations sent and received
- Cannot modify team after deadline

---

#### **T1.3: Project Submission** (6-8 hours)

**Objective:** Enable drafting and submission of projects

**Backend Work**
- Submission CRUD endpoints
- Submission field handling (custom questions)
- Draft vs. submitted state
- Prevent editing after deadline
- Prevent editing after submission
- Validate required fields
- Handle image/file uploads (base64 embed in DB)

**Frontend Work**
- Submission form (name, tagline, description, images, URLs, questions)
- Form validation (real-time feedback)
- Image upload/preview
- Draft save (auto-save optional)
- Submit action (confirmation)

**Database**
- No schema changes (already present)

**Tests**
- Test draft creation
- Test editing draft before submission
- Test prevent editing after submission
- Test prevent submission after deadline
- Test image upload
- Test required field validation

**Definition of Done**
- Team can create submission
- Can edit before submitting
- Can submit (locked)
- Cannot edit after submission or deadline
- Organizer can see all submissions

---

#### **T1.4: Public Gallery** (4-5 hours)

**Objective:** Create browsable, searchable project gallery

**Backend Work**
- Gallery endpoints (list submissions with pagination)
- Search by name/tag
- Filter by track
- Project detail endpoint
- Sorting (by submission date, project name)

**Frontend Work**
- Gallery page (grid or list layout)
- Project cards (name, tagline, thumbnail)
- Search bar
- Filter dropdowns (track)
- Project detail modal/page (full description, images, links)
- Pagination

**Database**
- No schema changes

**Tests**
- Test gallery loads projects
- Test search filters results
- Test track filter works
- Test pagination

**Definition of Done**
- Visitor can browse gallery
- Can search and filter
- Can view project details
- Gallery loads quickly (< 500ms)

---

#### **T1.5: Integration & Testing** (4-6 hours)

**Objective:** Wire up all T1 components end-to-end

**Backend Work**
- Test complete workflow: register → create event → form team → submit → browse gallery
- Fix integration bugs
- Add comprehensive error handling

**Frontend Work**
- Connect UI to backend APIs
- Handle loading states
- Error messages

**Tests**
- E2E test: full T1 workflow
- API integration tests

**Definition of Done**
- Complete T1 workflow functional
- No broken links
- All pages accessible
- Error cases handled gracefully

---

#### **T1.6: Documentation & Acceptance** (2-3 hours)

**Documentation**
- Update README.md with T1 capabilities
- Update ARCHITECTURE.md
- Update DATA-MODEL.md
- Document API endpoints

**Acceptance**
- Run acceptance suite (T1 tests)
- Fix any failures
- Commit acceptance report

**Definition of Done**
- All T1 acceptance criteria pass
- Documentation updated
- Acceptance report generated

---

**T1 Summary**
- Duration: ~30-35 hours of development
- Deliverable: Functional hackathon registration, team formation, and submission system
- Acceptance: T1 acceptance suite passes

---

## 12. T2 IMPLEMENTATION PLAN (Judging)

T2 is the core engineering challenge. Role isolation and normalization are critical.

### T2 Phase Breakdown

#### **T2.0: Judge Management** (4-5 hours)

**Objective:** Invite judges and track status

**Backend Work**
- Judge creation (invite flow)
- Judge status tracking (INVITED, ACCEPTED, DECLINED)
- Judge tracking by track
- Notification system (in-app)

**Frontend Work**
- Judge invite form (email, track assignment)
- Judge list (organizer dashboard)
- Judge status indicators

**Database**
- No schema changes (already present)

**Tests**
- Test judge invitation
- Test invitation acceptance/decline
- Test track assignment

**Definition of Done**
- Organizer can invite judges
- Judges notified of invitations
- Judges can accept/decline
- Track assignment recorded

---

#### **T2.1: Judge Assignment** (6-8 hours)

**Objective:** Assign judges to projects fairly

**Backend Work**
- Manual assignment UI backend
- Batch assignment algorithm (greedy even distribution)
- Ensure judges only assigned to their tracks
- Prevent over-assignment
- Assignment status tracking

**Frontend Work**
- Assignment interface (drag-drop or checkboxes)
- Batch assignment trigger
- Assignment progress

**Database**
- No schema changes (already present)

**Tests**
- Test manual assignment
- Test batch algorithm
- Test track constraint enforcement
- Test no duplicate assignments

**Definition of Done**
- Organizer can assign judges manually
- Batch assignment distributes evenly
- All eligible projects assigned minimum judges
- Track constraints enforced

---

#### **T2.2: Rubric & Scoring** (6-8 hours)

**Objective:** Define scoring criteria with weights; implement scoring interface

**Backend Work**
- Rubric CRUD
- Criterion creation with weights
- Scoring endpoints (POST score)
- Validate score range
- Prevent modification after submission
- Calculate weighted final score per submission

**Frontend Work**
- Rubric configuration form (criteria + weights)
- Judge scoring interface (form or cards)
- Score submission (confirmation)
- Prevent re-entry

**Database**
- No schema changes (already present)

**Tests**
- Test rubric creation
- Test weight validation (must sum to 100%)
- Test scoring endpoint
- Test prevent modification after submission
- Test weighted average calculation

**Definition of Done**
- Organizer can create rubric
- Weights validated
- Judges can score projects
- Scores stored and immutable

---

#### **T2.3: Judge Isolation (Backend Authorization)** (8-10 hours)

**CRITICAL OBJECTIVE:** Ensure Judge A cannot access Judge B's scores via API

**Backend Work**
- Judge scope middleware (filter all queries by assigned projects/tracks)
- Implement authorization checks on every judge-facing endpoint
- Score access: judge can only see own scores
- Assignment access: judge can only see own assignments
- Project access: judge can only see assigned projects in their tracks
- Audit log every authorization check

**Tests** (ESSENTIAL)
- Judge A tries to access Judge B's scores → 403
- Judge A tries to list all scores → 403 (only sees own)
- Judge A tries to access submission outside their track → 403
- Judge A tries to PUT/PATCH peer's score → 403
- Judge A tries to access judge assignments for another judge → 403
- Audit log shows failed attempts

**Definition of Done**
- All authorization tests pass
- API-level enforcement verified
- No frontend-only checks
- Audit logs populated

---

#### **T2.4: Judge Dashboard** (4-5 hours)

**Objective:** Judges see pending work and scoring progress

**Backend Work**
- Dashboard endpoints (judge's assignments, submission details)
- Progress calculation (% scored)
- Organizer progress dashboard (all judges, % complete)

**Frontend Work**
- Judge dashboard (my assignments, scores, progress)
- Organizer dashboard (judge progress, statistics)

**Database**
- No schema changes

**Tests**
- Test judge dashboard loads
- Test organizer can see all judges
- Test progress calculation

**Definition of Done**
- Judge sees pending work
- Organizer sees overall progress
- Dashboards update in real-time

---

#### **T2.5: Score Normalization Engine** (8-10 hours)

**CRITICAL OBJECTIVE:** Implement z-score normalization with mathematical clarity

**Backend Work**
- Implement z-score normalization:
  ```
  for each submission:
    raw_average = mean of all judge scores
    raw_std_dev = std dev of all judge scores
    z_score = (x - raw_average) / raw_std_dev
    normalized_score = clip(map_to_scale(z_score), 0, 5)
  ```
- Store raw and normalized scores
- Calculate rankings (by normalized score)
- Generate normalization report (before/after comparison)

**Frontend Work**
- Organizer dashboard: view normalization results
- Show before/after rankings
- Export normalized scores

**Database**
- Populate `normalized_scores` table

**Tests**
- Test normalization math (sample data)
- Test ranking changes
- Test edge cases (all judges score same, outliers)
- Test reproducibility (same data → same results)

**Definition of Done**
- Normalization algorithm implemented
- Results documented and explained
- Report generated
- Reproducible with fixture data

---

#### **T2.6: CSV Export** (4-5 hours)

**Objective:** Export data at every stage

**Backend Work**
- Submissions export
- Judge assignments export
- Scores export (raw)
- Scores export (normalized)
- Results export

**Frontend Work**
- Download button on organizer dashboard
- Multiple export formats

**Database**
- No schema changes

**Tests**
- Test CSV generation
- Test CSV structure
- Test data completeness

**Definition of Done**
- All major entities exportable as CSV
- Exports are consistent
- Organizer can download at any time

---

#### **T2.7: Integration & Testing** (6-8 hours)

**Objective:** Wire up T2 end-to-end

**Tests**
- E2E: Complete judging workflow (assign → score → normalize → export)
- Security tests (judge isolation)
- Performance tests (normalization with 100+ projects)

**Definition of Done**
- Full T2 workflow functional
- No security regressions
- All tests passing

---

#### **T2.8: Documentation & Acceptance** (3-4 hours)

**Documentation**
- Update JUDGING.md (rubric, normalization, assignment algorithm)
- Update API docs
- Add judge isolation explanation

**Acceptance**
- Run T2 acceptance suite
- Verify judge isolation (key criterion)
- Verify normalization reproducibility

**Definition of Done**
- T2 acceptance suite passes
- Judging documented clearly
- Acceptance report updated

---

**T2 Summary**
- Duration: ~45-55 hours of development
- Deliverable: Complete judging system with role isolation and normalization
- Critical success: Judge isolation verified at API level

---

## 13. T3 IMPLEMENTATION PLAN (Public Features)

T3 focuses on community features and voting integrity.

### T3 Phase Breakdown

#### **T3.0: Voting Infrastructure** (6-8 hours)

**Objective:** Build voting system with access modes

**Backend Work**
- Vote endpoints (POST vote)
- Configurable voting modes (open link, email-gated, authenticated)
- Vote storage with metadata (IP, user agent, voter)
- Results calculation (vote count per submission)

**Frontend Work**
- Voting interface (radio buttons or buttons)
- Results display (after voting closes)
- Results hidden during voting (if configured)

**Database**
- `votes` table (already in schema)

**Tests**
- Test vote creation
- Test vote counting
- Test access control by mode

**Definition of Done**
- Community can vote
- Vote counted accurately
- Access enforced per mode

---

#### **T3.1: Rate Limiting & Duplicate Detection** (6-8 hours)

**Objective:** Prevent voting abuse

**Backend Work**
- In-memory or Redis rate limiter (10 votes/hour per IP)
- Duplicate detection (by IP, voter_id, cookie)
- Audit trail logging
- VoteAudit table population

**Frontend Work**
- Rate limit feedback (friendly message)

**Database**
- Populate `vote_audits` table

**Tests**
- Test rate limiting (submit 11 votes in 1 hour → blocked)
- Test duplicate detection (same voter twice → blocked)
- Test audit log entries

**Definition of Done**
- Rate limiting blocks spam
- Duplicates prevented
- Audit trail complete

---

#### **T3.2: Hidden Results & Access Control** (4-5 hours)

**Objective:** Results hidden during voting; organizers see live

**Backend Work**
- Gate results endpoint by event status
- Organizer exception (can always see)
- Results only visible after VOTING_CLOSED state

**Frontend Work**
- Results page shows "Voting in progress" during voting window
- Organizer dashboard shows live results

**Database**
- No schema changes

**Tests**
- Test participant cannot see results during voting
- Test organizer can see live results
- Test results visible after voting closes

**Definition of Done**
- Results hidden during voting
- Organizer access working
- Results displayed after deadline

---

#### **T3.3: Randomized Ballot** (4-5 hours)

**Objective:** Display projects in random order per voter

**Backend Work**
- Shuffle projects on gallery endpoint (seeded random per user session)
- Different shuffle per voter

**Frontend Work**
- Projects appear in randomized order

**Database**
- No schema changes

**Tests**
- Test projects in different order for different users
- Test consistent order for same user in same session

**Definition of Done**
- Projects randomized per voter
- Reduces positional bias

---

#### **T3.4: Comments** (4-5 hours)

**Objective:** Enable community feedback on submissions

**Backend Work**
- Comment endpoints (POST, DELETE)
- Moderation (organizer can delete)
- Threading support (optional)

**Frontend Work**
- Comment form
- Comment display
- Delete button (author, organizer)

**Database**
- No schema changes (already present)

**Tests**
- Test comment creation
- Test comment deletion (author, organizer)
- Test moderation

**Definition of Done**
- Community can comment
- Organizer can moderate
- Comments displayed on project detail

---

#### **T3.5: Integration & Testing** (4-6 hours)

**Tests**
- E2E: Voting workflow (vote → hidden results → reveal)
- Security: rate limiting and duplicate detection
- Results accuracy

**Definition of Done**
- Complete T3 workflow functional
- Voting integrity verified

---

#### **T3.6: Documentation & Acceptance** (2-3 hours)

**Documentation**
- Update README (voting features)
- Document voting security

**Acceptance**
- Run T3 acceptance suite

**Definition of Done**
- T3 acceptance suite passes
- Documentation updated

---

**T3 Summary**
- Duration: ~30-35 hours of development
- Deliverable: Community voting with abuse prevention
- Critical success: Voting integrity (no duplicate votes, rate limited)

---

## 14. T4 IMPLEMENTATION PLAN (Stretch Features)

T4 is bonus functionality. Prioritize breadth (implement all partially) over depth (fully implement one).

### T4 Phase Breakdown

#### **T4.0: REST API** (8-12 hours)

**Objective:** Expose all functionality via documented REST API

**Backend Work**
- Design consistent API schema (resources, endpoints, errors)
- Implement OpenAPI/Swagger documentation
- Version API (/v1/)
- Consistent request/response format

**Endpoints**
- Auth: POST /api/v1/auth/register, login, logout
- Events: GET, POST, PATCH /api/v1/events
- Submissions: GET, POST, PATCH /api/v1/submissions
- Scores: GET, POST /api/v1/scores
- Votes: POST /api/v1/votes
- Results: GET /api/v1/events/:id/results

**Frontend Work**
- (Optional) API documentation page
- Test API thoroughly

**Tests**
- Test each endpoint
- Test authorization at API level
- Test error responses

**Definition of Done**
- All major entities accessible via API
- Authorization enforced
- Documentation complete

---

#### **T4.1: Webhooks** (4-6 hours)

**Objective:** Notify external systems of events

**Backend Work**
- Webhook endpoint registration
- Event triggers (submission, judging complete, results published)
- Webhook delivery (retry logic optional)
- Webhook signature (HMAC optional)

**Tests**
- Test webhook delivery

**Definition of Done**
- Webhooks configured and delivered
- External systems can subscribe

---

#### **T4.2: Certificates & Records** (4-6 hours)

**Objective:** Generate and deliver certificates

**Backend Work**
- Certificate PDF generation (using PDF library)
- Signed records (optional: cryptographic signature)
- Participant certificates, judge records, winner certs

**Frontend Work**
- Certificate download

**Database**
- Populate `certificates` table

**Tests**
- Test certificate generation
- Test download

**Definition of Done**
- Certificates generated
- Downloadable by recipients

---

#### **T4.3: Embeddable Gallery** (3-4 hours)

**Objective:** Gallery widget for external sites

**Backend Work**
- Gallery API endpoint (minimal, optimized for embed)
- CORS headers for cross-origin embed

**Frontend Work**
- Standalone gallery widget (React component, or vanilla JS)

**Tests**
- Test embedding on sample site

**Definition of Done**
- Widget embeddable on external sites
- Displays correctly

---

#### **T4.4: Bulk Import/Export** (4-6 hours)

**Objective:** Data portability

**Backend Work**
- Export all event data (JSON, ZIP)
- Import data from export (with conflict resolution)
- Data validation on import

**Frontend Work**
- Import/export UI

**Tests**
- Test export → import cycle (data preserved)

**Definition of Done**
- Data fully portable
- Organizers can migrate events

---

**T4 Summary**
- Duration: ~25-35 hours of development
- Deliverable: APIs, webhooks, certificates, portability
- Recommendation: Implement API fully; others partially as time permits

---

## 15. TESTING STRATEGY

Testing is not a final phase; it runs parallel to development.

### 15.1 Unit Tests

**Scope:** Business logic, no database

**Coverage**
- Password hashing (bcrypt)
- Role-based permission checks
- Scoring calculations (z-score normalization)
- Weight validation
- Deadline enforcement
- Rate limiting logic

**Tools**
- Jest (Node.js)
- React Testing Library (frontend)

**Example**

```typescript
// test/judging.test.ts
describe('Normalization', () => {
  test('z-score normalization calculates correctly', () => {
    const scores = [3, 4, 5, 3, 4];
    const mean = 3.8;
    const stdDev = 0.84;
    
    const normalized = normalizeZScore(scores);
    
    expect(normalized[0]).toBeCloseTo(-0.95, 1);
  });
  
  test('weights sum to 100%', () => {
    const rubric = {
      criteria: [
        { name: 'Tech', weight: 0.4 },
        { name: 'Innovation', weight: 0.25 },
        { name: 'Usability', weight: 0.2 },
        { name: 'Impact', weight: 0.15 }
      ]
    };
    
    const total = rubric.criteria.reduce((sum, c) => sum + c.weight, 0);
    expect(total).toBe(1.0);
  });
});
```

### 15.2 Integration Tests

**Scope:** Components interacting with database

**Coverage**
- User registration and login
- Event creation and state transitions
- Team formation and invitations
- Submission lifecycle
- Judge assignment and scoring
- Voting and deduplication
- Authorization checks (judge isolation)

**Tools**
- Supertest (API testing)
- Jest + Docker SQLite

**Example**

```typescript
// test/api.test.ts
describe('Judge Isolation', () => {
  test('Judge A cannot access Judge B scores', async () => {
    const judgeA = await createUser('judge-a@test.com');
    const judgeB = await createUser('judge-b@test.com');
    const submission = await createSubmission();
    
    // Assign both judges to same submission
    await assignJudge(judgeA, submission);
    await assignJudge(judgeB, submission);
    
    // Judge B scores submission
    const score = await judgeB.post('/api/scores', {
      submission_id: submission.id,
      criterion_id: 'criterion-1',
      score: 5
    });
    
    // Judge A tries to access score
    const response = await judgeA.get(`/api/scores/${score.id}`);
    expect(response.status).toBe(403);
  });
});
```

### 15.3 End-to-End Tests

**Scope:** Complete workflows from UI

**Coverage**
- Register → Create Event → Form Team → Submit → Browse Gallery
- Invite Judge → Assign Project → Score → Normalize → Publish Results
- Vote → Hidden Results → Reveal

**Tools**
- Cypress or Playwright

**Example**

```typescript
// e2e/main-workflow.cy.ts
describe('Complete Hackathon Workflow', () => {
  it('should complete from registration to results', () => {
    // Register
    cy.visit('/register');
    cy.get('[data-testid=email]').type('participant@test.com');
    cy.get('[data-testid=password]').type('password');
    cy.get('[data-testid=register-btn]').click();
    
    // Create event
    cy.visit('/dashboard');
    cy.get('[data-testid=create-event]').click();
    cy.get('[data-testid=event-name]').type('My Event');
    cy.get('[data-testid=save]').click();
    cy.contains('Event created');
    
    // ... continue workflow
  });
});
```

### 15.4 Security Tests

**Coverage**
- Judge score isolation (API-level)
- Track isolation
- Voting duplicate detection
- Rate limiting
- Session expiry
- Password reset
- Authorization on every endpoint

**Example**

```typescript
// test/security.test.ts
describe('Authorization', () => {
  test('Visitor cannot create event', async () => {
    const visitor = { role: 'VISITOR' };
    const response = await createEvent(visitor, { name: 'Hacked' });
    expect(response.status).toBe(403);
  });
  
  test('Judge cannot vote twice', async () => {
    const judge = await createUser('judge@test.com');
    const submission = await createSubmission();
    
    await judge.post('/api/votes', { submission_id: submission.id });
    const second = await judge.post('/api/votes', { submission_id: submission.id });
    
    expect(second.status).toBe(400);
    expect(second.body.error).toContain('already voted');
  });
});
```

### 15.5 Acceptance Tests

**Scope:** Validation against acceptance suite requirements

**Coverage**
- T1: Can register, form team, submit, browse gallery
- T2: Judge assignment, role isolation, normalization
- T3: Voting, rate limiting, hidden results
- T4: API, webhooks, export

**Tools**
- Official acceptance suite (provided)

### 15.6 Testing Timeline

| Phase | Coverage | Priority |
|-------|----------|----------|
| T1.0 (Foundation) | Auth unit tests, registration integration | HIGH |
| T1.1-1.4 (Core) | Each feature's integration tests | HIGH |
| T1.5 (Integration) | Full T1 E2E workflow | HIGH |
| T2.0-2.5 (Judging) | Judge isolation security tests | CRITICAL |
| T2.6 (Integration) | Normalization unit tests | CRITICAL |
| T3.0-3.4 (Voting) | Voting security tests (duplicates, rate limit) | HIGH |
| T4 (Stretch) | API tests, webhook tests | MEDIUM |

---

## 16. DOCUMENTATION STRATEGY

### 16.1 Submission-Required Docs

**README.md**
- What is this platform?
- How to run it (`docker compose up`)
- What's supported (T1/T2/T3/T4 status)
- Known limitations
- Technology stack

**ARCHITECTURE.md**
- System overview (components, data flow)
- Frontend/backend separation
- API layer design
- Database design philosophy
- Key technologies and why chosen

**DATA-MODEL.md**
- Entity relationship diagram
- Database schema (tables, relationships)
- Lifecycle of key entities (Event, Submission, Score, Vote)
- Immutable records and why

**JUDGING.md**
- Judge assignment strategy (algorithm, fairness)
- Scoring methodology (rubrics, weighting)
- Normalization methodology (math, before/after examples)
- Role isolation details (how judges are restricted)
- Audit mechanisms

**acceptance-report.txt**
- Output of acceptance suite
- Tier-by-tier results
- Any failures documented

---

### 16.2 Recommended Internal Docs

**docs/DEVELOPMENT.md**
- Local setup instructions
- Running tests
- Building frontend/backend
- Debugging tips

**docs/SETUP.md**
- Prerequisites (Node.js version, Docker)
- Installation steps
- Environment variables
- Seed data

**docs/SECURITY.md**
- Authentication flow
- Authorization model
- Known vulnerabilities
- Security best practices

**docs/API.md**
- Endpoint reference
- Request/response examples
- Error codes
- Rate limits
- Webhook documentation

**docs/DATABASE.md**
- Schema details
- Migration strategy
- Backup/restore
- Data export/import

**docs/TESTING.md**
- Test structure
- Running tests
- Writing new tests
- Coverage targets

**docs/ADR/**
- Architecture Decision Records (numbered)
- Each major decision documented

**docs/ROADMAP.md**
- Future improvements
- Known issues
- Scalability considerations

---

### 16.3 Documentation Timeline

| Document | When | Owner |
|----------|------|-------|
| README.md | After T1 | Team |
| ARCHITECTURE.md | After T1 | Architect |
| DATA-MODEL.md | After T1 | DB Lead |
| JUDGING.md | After T2 | Judging Lead |
| API.md | During T4 | API Lead |
| DEVELOPMENT.md | During T1 | DevOps/Lead |
| SECURITY.md | After T2 | Security Lead |
| Others | Throughout | Various |
| acceptance-report.txt | At submission | Team |

---

## 17. DEVELOPER WORKFLOW

### 17.1 Branch Strategy

**Main**
- Production-ready code
- All tests passing
- Acceptance suite passing

**Develop**
- Integration branch
- Features merged here before main
- Tests must pass

**Feature Branches**
- Per ticket/requirement
- Naming: `feature/auth-login`, `fix/judge-isolation`
- Branched from develop
- Merged via pull request

**Release Branch** (for submission)
- `release/submission` branch
- Final polish and acceptance verification
- Merged to main at submission time

---

### 17.2 Commit Conventions

```
feat: Add judge isolation middleware
fix: Correct z-score normalization edge case
refactor: Simplify authorization check
test: Add judge isolation tests
docs: Update JUDGING.md with normalization details
chore: Update dependencies
```

---

### 17.3 Pull Request Process

1. Create PR from feature branch to develop
2. Self-review + code review (if team > 1)
3. Run tests locally: `npm test`
4. Ensure acceptance suite passes
5. Merge to develop
6. Verify develop branch health

---

### 17.4 Definition of Done (Per Feature)

- [ ] Code written and self-reviewed
- [ ] Tests written and passing
- [ ] Authorization verified (if applicable)
- [ ] Database changes migrated
- [ ] Error handling implemented
- [ ] UI is usable (if frontend)
- [ ] Documentation updated
- [ ] Seed data reflects feature
- [ ] Acceptance tests pass
- [ ] No critical security issues
- [ ] Merged to develop

---

### 17.5 Code Review Checklist

- Does code match architecture?
- Are edge cases handled?
- Is error handling present?
- Are authorization checks in place?
- Are database queries efficient?
- Is code testable?
- Is it documented?

---

## 18. FRONTEND / UX STRATEGY

### 18.1 UX Principles

The interface should feel:

**Technical & Intentional**
- Avoid "AI SaaS" clichés (glassmorphism, purple gradients)
- Clear hierarchy, strong typography
- Meaningful spacing and alignment

**Trustworthy**
- Honest error messages
- Clear feedback (form validation, save confirmation)
- Transparent process (show deadlines, status)

**Efficient**
- Minimal clicks to accomplish tasks
- Keyboard shortcuts where appropriate
- Fast interactions (< 200ms response)

**Accessible**
- WCAG AA compliance
- Semantic HTML
- Color contrast

---

### 18.2 Key Surfaces

**Public Gallery**
- Browse projects
- Search and filter
- Project detail (images, description, links)
- Vote (if enabled)
- Comments

**Authentication**
- Registration form
- Login form
- Password reset
- Session timeout

**Participant Dashboard**
- My teams
- My submissions (draft, submitted)
- Invitation status
- Voting interface

**Judge Dashboard**
- Assigned projects
- Scoring interface (rubric form)
- Scoring progress
- Submit scores

**Organizer Dashboard**
- Event overview (timeline, status)
- Judge progress (% complete)
- Submission review
- Assignment interface
- Results preview
- Normalization results
- Voting activity
- Export buttons

**Admin**
- User management
- System configuration
- Audit logs (organizer only)

---

### 18.3 Design System (Minimal)

**Typography**
- Headings: Clean, sans-serif (Inter, system font)
- Body: Legible, 14-16px
- Mono: For code, timestamps

**Colors**
- Neutral palette (grays)
- Accent for primary actions (blue or green)
- Red for destructive actions
- No unnecessary decorative colors

**Spacing**
- Consistent 8px or 16px grid
- Adequate whitespace

**Components**
- Forms (text, select, checkbox, radio)
- Buttons (primary, secondary, danger)
- Cards (submissions, results)
- Tables (scores, assignments, exports)
- Modals (confirmations)

**Layout**
- Responsive (mobile, tablet, desktop)
- Fixed header/sidebar for navigation
- Main content area

---

### 18.4 Frontend Stack

**Recommendation: React + TypeScript + Tailwind CSS + Vite**

**Why**
- React: Large ecosystem, many developers familiar
- TypeScript: Catches bugs early
- Tailwind: Utility-first CSS, fast styling
- Vite: Fast dev server, fast builds

**Alternatives**
- SvelteKit (more opinionated, faster to write)
- Vue + Vite (similar to React, smaller ecosystem)

**State Management**
- React Context (small app)
- TanStack Query (data fetching)
- No Redux needed (unless heavy real-time updates)

**Data Fetching**
- TanStack Query (SWR alternative)
- Handles caching, refetching, error states

---

### 18.5 Accessibility Considerations

- ARIA labels on form inputs
- Keyboard navigation (Tab, Enter, Escape)
- Color contrast (WCAG AA)
- Alt text on images
- Form validation messages
- Skip navigation links

---

## 19. OPERATIONAL & DEPLOYMENT PLAN

### 19.1 Docker Architecture

**docker-compose.yml**

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: sqlite:./data/dogfood.db
      SESSION_SECRET: ${SESSION_SECRET:-dev-secret-change-in-prod}
      JWT_SECRET: ${JWT_SECRET:-dev-secret-change-in-prod}
    volumes:
      - ./data:/app/data  # Persist SQLite database
    depends_on:
      - db  # Optional: if using PostgreSQL
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Optional: PostgreSQL for production
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: dogfood
      POSTGRES_PASSWORD: ${DB_PASSWORD:-dev-password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    profiles:
      - postgres

volumes:
  postgres_data:
  data:
```

**Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Seed database on startup
RUN npm run migrate:deploy && npm run seed

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start app
CMD ["npm", "start"]
```

### 19.2 Local Deployment

```bash
# One command to run
docker compose up

# Or with seed data reset
docker compose down -v && docker compose up

# Access at http://localhost:3000
```

### 19.3 Environment Variables

**.env.example**

```env
# Database
DATABASE_URL=sqlite:./data/dogfood.db
# DATABASE_URL=postgres://user:password@localhost:5432/dogfood

# Security
SESSION_SECRET=your-session-secret-here
JWT_SECRET=your-jwt-secret-here

# App
NODE_ENV=development
APP_URL=http://localhost:3000

# Email (optional)
SMTP_HOST=localhost
SMTP_PORT=1025

# Logging
LOG_LEVEL=info
```

### 19.4 Startup Sequence

1. **Dockerfile entrypoint runs:**
   - Install deps
   - Build frontend
   - Run migrations (schema creation)
   - Seed database with fixture data
   - Start server

2. **Server startup:**
   - Connect to database
   - Initialize session store
   - Start Express server
   - Log "Ready on port 3000"

3. **Health check:**
   - Docker monitors /health endpoint
   - Container restart if unhealthy (after 3 retries)

### 19.5 Backup & Restore

**SQLite Backup**
```bash
# Backup
docker cp dogfood-app-1:/app/data/dogfood.db ./backup.db

# Restore
docker cp ./backup.db dogfood-app-1:/app/data/dogfood.db
```

**PostgreSQL Backup** (if used)
```bash
# Backup
docker exec dogfood-db-1 pg_dump -U postgres dogfood > backup.sql

# Restore
docker exec -i dogfood-db-1 psql -U postgres dogfood < backup.sql
```

### 19.6 Operations Checklist

- [ ] `docker compose up` starts cleanly
- [ ] Seed data present and correct
- [ ] All services healthy
- [ ] No external network calls required
- [ ] Data persists across restarts
- [ ] Logs are accessible
- [ ] Error handling graceful (no 500 without logging)
- [ ] Backup/restore documented

---

## 20. SEED DATA STRATEGY

### 20.1 Fixture Data

**Development seed data includes:**

```javascript
// seedData.ts
const seedData = {
  users: [
    { id: 'user-admin', email: 'admin@test.com', password, role: 'ADMIN' },
    { id: 'user-org', email: 'organizer@test.com', password, role: 'ORGANIZER' },
    { id: 'judge-1', email: 'judge1@test.com', password, role: 'JUDGE' },
    { id: 'judge-2', email: 'judge2@test.com', password, role: 'JUDGE' },
    { id: 'judge-3', email: 'judge3@test.com', password, role: 'JUDGE' },
    { id: 'participant-1', email: 'participant1@test.com', password, role: 'PARTICIPANT' },
    // ... 10 more participants
  ],
  
  events: [
    {
      id: 'event-1',
      name: 'Test Hackathon 2026',
      organizer_id: 'user-org',
      status: 'JUDGING',
      registration_start: '2026-09-01',
      submission_start: '2026-09-10',
      judging_start: '2026-09-20',
      // ...
    }
  ],
  
  tracks: [
    { id: 'track-1', event_id: 'event-1', name: 'Web' },
    { id: 'track-2', event_id: 'event-1', name: 'Mobile' },
    { id: 'track-3', event_id: 'event-1', name: 'AI/ML' }
  ],
  
  teams: [
    { id: 'team-1', event_id: 'event-1', name: 'Team Alpha', owner_id: 'participant-1' },
    // ... 10 more teams
  ],
  
  submissions: [
    { id: 'sub-1', team_id: 'team-1', track_id: 'track-1', 
      name: 'WebApp Project', status: 'ELIGIBLE' },
    // ... 20-30 submissions across tracks
  ],
  
  judges: [
    { id: 'judge-1', event_id: 'event-1', user_id: 'judge-1', status: 'ACCEPTED' },
    // ... all judges
  ],
  
  judgeAssignments: [
    { id: 'ja-1', judge_id: 'judge-1', submission_id: 'sub-1' },
    // ... 60-90 assignments (3 judges per submission)
  ],
  
  scores: [
    { id: 'score-1', judge_id: 'judge-1', submission_id: 'sub-1', 
      criterion_id: 'crit-1', score: 4 },
    // ... complete scoring across all submissions
  ]
};
```

### 20.2 Seed Script

```bash
# npm run seed

# Clears database and loads fixture data
# Idempotent (safe to run multiple times)
# Creates known users with deterministic passwords for testing
```

### 20.3 Deterministic Credentials

For development/testing:

```
Admin: admin@test.com / password
Organizer: organizer@test.com / password
Judge1: judge1@test.com / password
Participant1: participant1@test.com / password
```

**Important:** These are ONLY for development. Production uses random passwords.

---

## 21. ACCEPTANCE-DRIVEN DEVELOPMENT

### 21.1 Acceptance Suite Alignment

The official acceptance suite tests:

**T1 Acceptance**
- [ ] System starts with `docker compose up`
- [ ] Can register and login
- [ ] Organizer can create event
- [ ] Participants can form teams
- [ ] Can submit projects
- [ ] Public gallery works

**T2 Acceptance**
- [ ] Judge can be invited
- [ ] Can score projects with rubric
- [ ] Judge A cannot see Judge B's scores (API-enforced)
- [ ] Normalization produces results
- [ ] CSV export works

**T3 Acceptance**
- [ ] Community voting works
- [ ] Results hidden during voting
- [ ] Rate limiting prevents spam

**T4 Acceptance**
- [ ] REST API endpoints functional
- [ ] Authorization enforced on API
- [ ] Webhooks delivered
- [ ] Import/export cycle preserves data

### 21.2 Test Mapping

For every acceptance requirement:

| Requirement | Unit Test | Integration Test | E2E Test | Manual Test |
|-------------|:---:|:---:|:---:|:---:|
| Judge isolation | ✗ | ✓ | ✓ | ✓ |
| Normalization | ✓ | ✓ | ✗ | ✓ |
| Rate limiting | ✓ | ✓ | ✓ | ✓ |
| API authorization | ✗ | ✓ | ✗ | ✓ |

### 21.3 Regression Testing

Before advancing to next tier:
- [ ] All previous tier tests still passing
- [ ] No new security issues introduced
- [ ] No performance degradation
- [ ] Database schema stable

---

## 22. DEFINITION OF DONE

A feature is **complete** when:

1. **Implemented:** Code exists and works
2. **Tested:** 
   - Unit tests (if applicable)
   - Integration tests (if API)
   - E2E tests (if user-facing)
3. **Authorized:** (If applicable)
   - Backend enforces permissions
   - Frontend respects permissions
   - Authorization tests pass
4. **Migrated:** Database changes deployed
5. **Documented:** 
   - Code comments for complex logic
   - README updated
   - Relevant docs updated
6. **Seed Data:** Feature reflected in development seed
7. **Error Handling:** All error cases handled gracefully
8. **Acceptance:** Passes acceptance suite criteria
9. **Reviewed:** (If team > 1) Code reviewed and approved
10. **Merged:** Merged to develop branch

---

## 23. 72-HOUR EXECUTION PLAN

### Hour 0-2: Kickoff & Setup
- Read brief and acceptance suite
- Discuss architecture
- Set up repository structure
- Initialize Docker/project structure
- Create task board

### Hour 2-8: T1.0 Foundation
- Database schema (create tables)
- Authentication (register, login, sessions)
- Authorization middleware
- Basic frontend (pages, navigation)
- Commit foundation and tag

### Hour 8-16: T1 Features (Incremental)
- Hour 8-10: Event management
- Hour 10-12: Team formation
- Hour 12-14: Project submission
- Hour 14-16: Public gallery
- Test after each feature

### Hour 16-20: T1 Integration & Testing
- Wire up all T1 components
- E2E testing (full workflow)
- Fix bugs
- Acceptance test (T1)
- **T1 Freeze** (do not change T1 from here)

### Hour 20-28: T2 Features (Core Engineering)
- Hour 20-22: Judge management & assignment
- Hour 22-25: Rubrics & scoring interface
- Hour 25-28: **Judge isolation (CRITICAL)**
  - Implement authorization checks
  - Write security tests
  - Verify API-level enforcement

### Hour 28-35: T2 Normalization & Export
- Hour 28-31: Normalization algorithm & tests
- Hour 31-33: Organizer dashboards
- Hour 33-35: CSV export
- **T2 Freeze**

### Hour 35-42: T3 Features (Community)
- Hour 35-37: Voting infrastructure
- Hour 37-39: Rate limiting & duplicate detection
- Hour 39-41: Comments & results hiding
- Hour 41-42: T3 testing & fixes
- **T3 Freeze**

### Hour 42-53: T4 & Buffer (if ahead)
- Hour 42-46: REST API (if time)
- Hour 46-50: Webhooks, certificates, export
- Hour 50-53: Buffer for fixing bugs

### Hour 53-60: Integration & Hardening
- Fix integration bugs
- Security audit
- Performance testing
- Run acceptance suite multiple times

### Hour 60-66: Documentation & Submission
- README.md
- ARCHITECTURE.md
- DATA-MODEL.md
- JUDGING.md
- Acceptance report
- Demo video

### Hour 66-72: Final QA & Buffer
- Final acceptance suite run
- Fix any last-minute issues
- Create submission package
- **Code Freeze at Hour 72**

---

## 24. CRITICAL PATH

**Dependencies that can block entire project:**

```
Database Schema
  ↓
Authentication
  ↓
Authorization / RBAC
  ↓
Event Management
  ↓
Submission Lifecycle
  ├─→ Team Formation (parallel)
  ├─→ Public Gallery (parallel)
  │
  ↓
Judge Assignment
  ↓
Judging Interface
  ├→ Judge Isolation (CRITICAL)
  │
  ↓
Score Normalization
  ↓
Voting Infrastructure
  ├→ Rate Limiting
  │
  ↓
Results Publication
  ├→ Hidden Results
  │
  ↓
Data Export
  │
  ├─→ REST API (optional)
  ├─→ Webhooks (optional)
  ├─→ Certificates (optional)
  │
  ↓
Integration & Testing
  ↓
Acceptance Suite
  ↓
Documentation & Release
```

**If database schema breaks:** All downstream work blocked (HIGH RISK)  
**If auth breaks:** Cannot test anything (HIGH RISK)  
**If judge isolation breaks:** T2 acceptance fails (CRITICAL)  
**If normalization breaks:** Cannot complete T2 (HIGH RISK)  
**If voting abuse prevention breaks:** T3 integrity compromised (HIGH RISK)

**Mitigation:** Test these thoroughly as they're implemented.

---

## 25. RISK REGISTER

| Risk | Probability | Impact | Mitigation | Contingency |
|------|:-----------:|:------:|-----------|-----------|
| Database redesign needed mid-project | Medium | High | Finalize schema in first 4 hours | Freeze schema, no changes after T1 |
| Judge isolation bugs (hard to catch) | Medium | Critical | Write security tests immediately | Extended T2 testing phase |
| Normalization math wrong | Low | High | Unit test normalization with fixtures | Use simple averaging if time runs out |
| Voting abuse detection insufficient | Low | Medium | Implement rate limiting + duplicates | Disable voting, publish judge results only |
| Docker deployment fails | Low | High | Test locally early and often | Provide manual setup instructions |
| Integration bugs appear late | High | Medium | E2E testing after each tier | Extra 4-6 hour buffer allocated |
| Acceptance suite failures | Medium | High | Run acceptance suite every 12 hours | Fix bugs immediately, do not advance |
| Scope creep (trying to do too much) | High | High | Frozen scope after kickoff, T4 optional | Cut T4 features if T1/T2 at risk |
| Frontend consuming too much time | Medium | Medium | Use simple design, avoid animations | Pre-made component library (Tailwind) |
| Documentation left to the end | High | Medium | Write docs incrementally | Auto-generate some docs from code |

---

## 26. SCOPE CONTROL

### Must Have (T1 + T2)
- Authentication and authorization
- Event lifecycle
- Team formation and submission
- Public gallery
- Judge assignment
- Scoring with rubrics
- Judge isolation (backend-enforced)
- Score normalization
- CSV export
- Acceptance suite compliance

### Should Have (T3)
- Community voting
- Rate limiting and duplicate detection
- Hidden results
- Comments

### Could Have (T4)
- REST API
- Webhooks
- Certificates
- Embeddable gallery
- Bulk import/export

### Will Not Have
- External authentication (OAuth, LDAP)
- Real-time notifications (email only)
- Advanced analytics
- Machine learning for scoring
- Video transcoding
- Advanced image optimization
- Microservices
- Cloud deployment

---

## 27. FINAL REPOSITORY STRUCTURE

```
dogfood/
├── README.md                          # Main readme
├── ARCHITECTURE.md                    # Architecture overview
├── DATA-MODEL.md                      # Database schema
├── JUDGING.md                         # Judging details
├── LICENSE                            # MIT or Apache-2.0
├── acceptance-report.txt              # Acceptance suite output
├── .gitignore
│
├── docker-compose.yml                 # Docker setup
├── Dockerfile                         # App container
├── .env.example                       # Environment template
│
├── package.json                       # Node.js dependencies
├── tsconfig.json                      # TypeScript config
├── vitest.config.ts                   # Test config
│
├── src/
│   ├── server.ts                      # Express app entry
│   │
│   ├── middleware/
│   │   ├── auth.ts                    # Authentication
│   │   ├── authorize.ts               # RBAC middleware
│   │   ├── errorHandler.ts            # Error handling
│   │   └── audit.ts                   # Audit logging
│   │
│   ├── routes/
│   │   ├── auth.ts                    # Auth endpoints
│   │   ├── events.ts                  # Event endpoints
│   │   ├── submissions.ts             # Submission endpoints
│   │   ├── judging.ts                 # Judging endpoints
│   │   ├── voting.ts                  # Voting endpoints
│   │   ├── results.ts                 # Results endpoints
│   │   └── admin.ts                   # Admin endpoints
│   │
│   ├── services/
│   │   ├── authService.ts             # Auth business logic
│   │   ├── eventService.ts            # Event logic
│   │   ├── judgingService.ts          # Judging logic
│   │   ├── normalizationService.ts    # Score normalization
│   │   ├── votingService.ts           # Voting logic
│   │   └── exportService.ts           # CSV/JSON export
│   │
│   ├── models/
│   │   ├── user.ts
│   │   ├── event.ts
│   │   ├── submission.ts
│   │   ├── score.ts
│   │   └── vote.ts
│   │
│   ├── db/
│   │   ├── prisma.ts                  # Prisma client
│   │   ├── seed.ts                    # Seed data
│   │   └── schema.prisma              # Database schema
│   │
│   └── utils/
│       ├── validation.ts              # Input validation
│       ├── errors.ts                  # Custom errors
│       └── logger.ts                  # Logging
│
├── client/                            # Frontend (React)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Auth/
│   │   │   ├── Dashboard/
│   │   │   ├── Gallery/
│   │   │   └── Admin/
│   │   │
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   ├── Forms/
│   │   │   └── Cards/
│   │   │
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   │
│   │   ├── lib/
│   │   │   └── api.ts                 # API client
│   │   │
│   │   └── styles/
│   │       └── globals.css
│   │
│   ├── public/
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
│
├── tests/
│   ├── unit/
│   │   ├── normalization.test.ts
│   │   ├── authorization.test.ts
│   │   └── scoring.test.ts
│   │
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── judging.test.ts
│   │   ├── voting.test.ts
│   │   └── security.test.ts
│   │
│   └── e2e/
│       └── main-workflow.cy.ts
│
├── docs/
│   ├── DEVELOPMENT.md                 # Setup & development
│   ├── SECURITY.md                    # Security details
│   ├── API.md                         # API documentation
│   ├── DATABASE.md                    # Database operations
│   ├── TESTING.md                     # Testing guide
│   ├── DEPLOYMENT.md                  # Deployment guide
│   │
│   ├── ADR/                           # Architecture Decision Records
│   │   ├── 001-architecture.md
│   │   ├── 002-database.md
│   │   ├── 003-auth.md
│   │   └── ...
│   │
│   └── ROADMAP.md                     # Future improvements
│
└── scripts/
    ├── seed.ts                        # Database seeding
    ├── migrate.ts                     # Migration runner
    └── build.sh                       # Build script
```

---

## 28. CONSOLIDATED ROADMAP

```
┌─────────────────────────────────────────────────────────────┐
│                  REQUIREMENTS ANALYSIS                       │
│ (Brief reading, entity identification, tier mapping)        │
└────────┬────────────────────────────────────────────────────┘
         │ 1 hour
         ↓
┌─────────────────────────────────────────────────────────────┐
│                  ARCHITECTURE & TECH STACK                   │
│ (Framework selection, DB choice, deployment model)          │
└────────┬────────────────────────────────────────────────────┘
         │ 1-2 hours
         ↓
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE SCHEMA                            │
│ (Create tables, relationships, indexes)                     │
└────────┬────────────────────────────────────────────────────┘
         │ 1-2 hours
         ↓
┌─────────────────────────────────────────────────────────────┐
│               INFRASTRUCTURE FOUNDATION                      │
│ (Docker, project setup, seed data)                          │
└────────┬────────────────────────────────────────────────────┘
         │ 2-3 hours
         ↓
┌─────────────────────────────────────────────────────────────┐
│               AUTHENTICATION & SESSIONS                      │
│ (Login, registration, session management)                   │
└────────┬────────────────────────────────────────────────────┘
         │ 3-4 hours
         ↓
┌─────────────────────────────────────────────────────────────┐
│           AUTHORIZATION & RBAC FRAMEWORK                     │
│ (Roles, permissions, middleware)                            │
└────────┬────────────────────────────────────────────────────┘
         │ 2-3 hours
         ↓
┌─────────────────────────────────────────────────────────────┐
│              T1 — CORE FEATURES (20-24 hours)               │
│  ├─ Event Management                                        │
│  ├─ Team Formation & Invitations                           │
│  ├─ Project Submission & Deadlines                         │
│  └─ Public Gallery                                         │
│                                                             │
│  Deliverable: Functional hackathon registration system     │
│  Acceptance: T1 suite passes                               │
└────────┬────────────────────────────────────────────────────┘
         │ Hours 16-20
         ↓
┌─────────────────────────────────────────────────────────────┐
│           T1 TESTING & FREEZE (2-3 hours)                   │
│  ├─ Integration tests                                       │
│  ├─ E2E workflow testing                                    │
│  ├─ Acceptance suite                                        │
│  └─ LOCK T1 (no changes to T1 from here)                    │
└────────┬────────────────────────────────────────────────────┘
         │ Hours 20-22
         ↓
┌─────────────────────────────────────────────────────────────┐
│            T2 — JUDGING (24-30 hours)                       │
│  ├─ Judge Management & Assignment                          │
│  ├─ Rubrics & Weighted Scoring                             │
│  ├─ Judge Isolation (CRITICAL)                             │
│  ├─ Judging Dashboard & Interface                          │
│  ├─ Score Normalization                                    │
│  └─ CSV Export                                             │
│                                                             │
│  Deliverable: Complete judging system                      │
│  Critical: Judge isolation backend-enforced               │
│  Acceptance: T2 suite passes                              │
└────────┬────────────────────────────────────────────────────┘
         │ Hours 22-35
         ↓
┌─────────────────────────────────────────────────────────────┐
│           T2 TESTING & FREEZE (2-3 hours)                   │
│  ├─ Security tests (judge isolation)                       │
│  ├─ Normalization validation                               │
│  ├─ Acceptance suite                                        │
│  └─ LOCK T2                                                │
└────────┬────────────────────────────────────────────────────┘
         │ Hours 35-37
         ↓
┌─────────────────────────────────────────────────────────────┐
│            T3 — PUBLIC FEATURES (14-18 hours)               │
│  ├─ Community Voting                                        │
│  ├─ Rate Limiting & Duplicate Detection                    │
│  ├─ Hidden Results & Access Control                        │
│  ├─ Randomized Ballot                                      │
│  └─ Comments                                               │
│                                                             │
│  Deliverable: Community voting with integrity              │
│  Acceptance: T3 suite passes                               │
└────────┬────────────────────────────────────────────────────┘
         │ Hours 37-45
         ↓
┌─────────────────────────────────────────────────────────────┐
│           T3 TESTING & FREEZE (1-2 hours)                   │
│  ├─ Voting security tests                                  │
│  ├─ Rate limiting verification                             │
│  └─ LOCK T3                                                │
└────────┬────────────────────────────────────────────────────┘
         │ Hours 45-47
         ↓
┌─────────────────────────────────────────────────────────────┐
│          T4 — STRETCH FEATURES (12-18 hours)                │
│  ├─ REST API (priority)                                     │
│  ├─ Webhooks                                                │
│  ├─ Certificates & Records                                 │
│  ├─ Embeddable Gallery                                     │
│  └─ Bulk Import/Export                                     │
│                                                             │
│  Deliverable: Optional advanced features                   │
│  Strategy: Implement core API; partial others if time      │
└────────┬────────────────────────────────────────────────────┘
         │ Hours 47-53
         ↓
┌─────────────────────────────────────────────────────────────┐
│          INTEGRATION & HARDENING (6-8 hours)                │
│  ├─ Fix cross-tier bugs                                     │
│  ├─ Security audit                                          │
│  ├─ Performance testing                                     │
│  ├─ Full acceptance suite (multiple runs)                   │
│  └─ Release candidate preparation                          │
└────────┬────────────────────────────────────────────────────┘
         │ Hours 53-60
         ↓
┌─────────────────────────────────────────────────────────────┐
│        DOCUMENTATION & FINAL SUBMISSION (6-12 hours)        │
│  ├─ README.md                                               │
│  ├─ ARCHITECTURE.md                                         │
│  ├─ DATA-MODEL.md                                           │
│  ├─ JUDGING.md                                              │
│  ├─ Acceptance report                                       │
│  ├─ Demo video (5 min max)                                  │
│  └─ Clean repository & LICENSE                             │
└────────┬────────────────────────────────────────────────────┘
         │ Hours 60-72
         ↓
┌─────────────────────────────────────────────────────────────┐
│          FINAL QA & CODE FREEZE (0-6 hours)                │
│  ├─ Last acceptance suite run                               │
│  ├─ Fix critical bugs only                                  │
│  ├─ Final documentation check                               │
│  └─ CODE FREEZE at Hour 72                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 29. IMMEDIATE NEXT STEPS (Hour 0-2)

### Hour 0 (Project Kickoff)

1. **Assemble Team** (if applicable)
   - Clarify roles (frontend, backend, devops, architecture)
   - Establish communication channels

2. **Read & Understand Brief**
   - Read Dogfood brief completely
   - Read this plan completely
   - Read acceptance suite criteria

3. **Architecture Kickoff Meeting** (30 min)
   - Confirm tech stack choices (Node.js, React, Prisma, SQLite)
   - Discuss architectural decisions (monolith, RBAC, normalization method)
   - Clarify judge isolation requirement
   - Confirm deployment model (Docker Compose)

4. **Create Project Structure**
   ```bash
   mkdir dogfood && cd dogfood
   git init
   npm init -y
   npm install express typescript tsx dotenv prisma bcrypt cors helmet
   npm install -D jest ts-jest supertest
   ```

5. **Set Up Git**
   - Create GitHub repo (public, MIT license)
   - Add .gitignore (node_modules, .env, dist, .DS_Store)
   - Initial commit: "initial: project setup"

6. **Create Task Board**
   - Kanban: Not Started | In Progress | Review | Done
   - List all T1, T2, T3 tasks
   - Assign owners (if team > 1)

---

### Hour 1-2 (Foundation)

1. **Database Schema**
   - Create Prisma schema (schema.prisma)
   - Run `prisma migrate dev --name init`
   - Verify tables created

2. **Seed Data Script**
   - Create `seed.ts` with fixture data
   - Run `npm run seed`
   - Verify data in database

3. **Docker Setup**
   - Create Dockerfile
   - Create docker-compose.yml
   - Test: `docker compose up` (should start cleanly)

4. **Git Commit**
   - `git add .`
   - `git commit -m "feat: initial database and docker setup"`
   - `git tag foundation`

---

### Hour 2+ Proceed to T1.0

Follow T1 implementation plan starting with authentication.

---

## 30. KEY SUCCESS FACTORS

1. **Judge Isolation is Non-Negotiable**
   - Test it early (Hour 25-28)
   - Test it thoroughly (API-level, not frontend)
   - Acceptance suite will specifically check this
   - Cannot advance to T3 if T2 isolation is broken

2. **Normalization Must Be Transparent**
   - Document the math clearly
   - Show before/after results
   - Be able to explain it to non-technical organizers
   - Normalization +5 bonus is valuable if done well

3. **Database Schema Locked After T1.0**
   - Major schema changes mid-project are catastrophic
   - Design schema carefully in first 4 hours
   - All future tiers depend on it
   - Schema upgrades should be backward-compatible

4. **Acceptance Suite is the Source of Truth**
   - Run it every 12 hours
   - Fix failures immediately (do not ignore)
   - Do not claim tiers you haven't verified
   - Overclaiming costs points

5. **Test Judge Isolation at API Level**
   - Cannot rely on frontend hiding endpoints
   - Write tests: Judge A tries to GET /api/scores/judge-b-score-id → 403
   - Include in security test suite
   - Document how it's enforced

6. **Seed Data Must Be Reproducible**
   - Same data every time `docker compose up` runs
   - Allows testing, debugging, and demos
   - Judges can see the system in action immediately
   - Seed must include multiple judges, submissions, scores

7. **Documentation is Part of the Product**
   - Not optional; required for adoption
   - Written incrementally, not at the end
   - README.md, ARCHITECTURE.md, JUDGING.md are evaluated
   - Clear == professional == adoptable

8. **Deploy Locally First, Always**
   - Test on clean laptop frequently
   - Catch Docker issues early
   - Ensure no external dependencies
   - `docker compose up` from scratch should work

---

## FINAL CLOSING

This is not a "build it fast" guide. It is a **"build it right, and do it fast"** guide.

The winning project is not the one with the most features. It is the one that:

1. **Actually works** (all tiers stable, not partially)
2. **Is secure** (judge isolation verified, voting integrity proven)
3. **Is understandable** (clear code, good docs)
4. **Can be adopted** (one command to run, no dependencies)
5. **Passes acceptance suite** (honest tier claims)

Quality > quantity.  
Correctness > features.  
Security > speed.  
Maintainability > cleverness.

The organization that wins the right to deploy this platform will use it for their events. They will operate it. They will debug issues. They will extend it. They need software they can trust and understand.

**Build for that organizer. Build for six months from now.**

---

**Document Prepared:** September 21, 2026  
**Hackathon Start:** September 25, 2026 18:00 UTC  
**Submission Deadline:** September 28, 2026 18:00 UTC  

Good luck.