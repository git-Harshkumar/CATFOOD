# Project Report — Hackathon Judgment Platform

## 1. Project Overview

The **Hackathon Judgment Platform** is an end-to-end web system built to administer hackathons from launch to judging and leaderboard publishing. It addresses the common operational pain points of engineering competitions:
- Team coordination and invite code verification.
- Deadline enforcement to maintain competition fairness.
- Multi-criteria judging rubrics with custom weights and score caps.
- Instant, verifiable calculation of winners without manual spreadsheet calculations.

---

## 2. Implemented Features & Capabilities

### 2.1 Event Administration (Organizers)
- Create events with start time, submission deadline, judging deadline, and participant limits.
- Define custom multi-criteria judging rubrics (e.g. Innovation 1.2x, Architecture 1.0x, UX 0.8x).
- Assign verified Judges by email address.
- Maintain draft/active/judging/completed status.
- Publish and unpublish finalized leaderboards to participants.

### 2.2 Team Management (Participants)
- Form teams for an active hackathon.
- Automatic generation of secure, cryptographically random invite codes (`TEAM-XXXX`).
- Join teams using invite codes with strict checks preventing duplicate team membership in the same event.
- Enforce event `maxTeamSize` constraints on team roster additions.

### 2.3 Project Submission Workflow
- Comprehensive project details: Title, Tagline, Overview, GitHub Repository URL, Live Demo URL, Demo Video URL, and Tech Stack tags.
- **Strict Server-Side Deadline Enforcement**: Any submission or modification attempted after `event.deadline` has elapsed is rejected with HTTP `403 Forbidden`.
- Team leader / member authorization: Cross-team project overwrites are strictly blocked.

### 2.4 Judging & Scoring Suite (Judges)
- Personalized evaluation queue listing assigned hackathons and project submissions.
- Interactive rubric scoring interface with real-time score sliders and qualitative feedback notes.
- Automatic score validation against criterion `maxScore` and non-negative boundaries.
- Ability to refine and update evaluation marks prior to leaderboard finalization.

### 2.5 Normalized Leaderboard Engine
- Aggregates multi-judge marks per criterion.
- Computes weighted score totals and percentage marks.
- Ranks teams descending by final score with tie-handling.
- Visual podium showcase for 1st (Gold), 2nd (Silver), and 3rd (Bronze) places.

---

## 3. Technology Stack Compliance Summary

| Layer | Requirement | Implementation | Status |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React + Vite | React 18 with Vite 6.1 | COMPLIANT |
| **Styling** | Tailwind CSS | Tailwind CSS 3.4 with custom theme & glassmorphism | COMPLIANT |
| **Backend Runtime** | Node.js | Node.js v24 | COMPLIANT |
| **API Framework** | Express.js | Express 4.21 with modular controllers and routes | COMPLIANT |
| **Development Server**| Nodemon | Nodemon 3.1 with watch config | COMPLIANT |
| **ORM** | Prisma | Prisma ORM 6.4 with typed models & migrations | COMPLIANT |
| **Database** | SQLite | SQLite file-based storage (`dev.db`) | COMPLIANT |
| **Testing** | Dedicated `tests/` | Dedicated root test directory with 34 tests | COMPLIANT |
| **Documentation** | Dedicated `docs/` | `docs/reports/` and `docs/implementation/` | COMPLIANT |
