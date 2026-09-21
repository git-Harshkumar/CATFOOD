# JuryFlow — Hackathon Judgment Platform

An enterprise-grade, full-stack hackathon management and judgment platform built with **React, Vite, Tailwind CSS, Express.js, Prisma ORM, and SQLite**.

---

## Architecture Overview

This project strictly conforms to mandatory architectural separation rules:

```text
hackathon-platform/
│
├── frontend/                     # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── pages/                # Pages (Auth, Events, Teams, Judging, Leaderboard)
│   │   ├── layouts/              # MainLayout, navigation
│   │   ├── context/              # AuthContext
│   │   ├── services/             # Centralized API service
│   │   └── utils/                # Formatters, badges
│   ├── public/
│   └── package.json
│
├── backend/                      # Node.js + Express + Prisma + SQLite
│   ├── prisma/
│   │   ├── schema.prisma         # Prisma data models
│   │   └── seed.js               # Demo dataset seeder
│   ├── src/
│   │   ├── controllers/          # HTTP request handlers
│   │   ├── routes/               # API route definitions
│   │   ├── middleware/           # Auth, RBAC, deadline & error handlers
│   │   ├── services/             # Core business logic & scoring math
│   │   ├── validators/           # Input schema validators
│   │   └── server.js             # Express application
│   ├── nodemon.json              # Development server config
│   └── package.json
│
├── tests/                        # Dedicated root-level test suite
│   ├── auth/                     # Authentication & token verification tests
│   ├── events/                   # Event creation & organizer authorization tests
│   ├── teams/                    # Team constraints & invite code tests
│   ├── submissions/              # Submissions & strict deadline enforcement tests
│   └── integration/              # End-to-end lifecycle & judging math tests
│
├── docs/                         # Dedicated project documentation
│   ├── reports/                  # Architecture, project & security audit reports
│   └── implementation/           # Auth, database, API, teams, submissions, deployment
│
├── .gitignore
└── README.md
```

---

## Technology Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, Tailwind CSS 3.4 |
| **Backend** | Node.js, Express.js 4.21, Nodemon |
| **ORM & Database** | Prisma 6.4, SQLite 3 |
| **Testing** | Native Node.js Test Runner & Assertions (`node:test`, `node:assert`) |
| **Documentation** | Structured Markdown (`docs/reports/`, `docs/implementation/`) |

---

## Quick Start

### 1. Setup Database & Seed
```bash
cd backend
npm install
npx prisma db push
node prisma/seed.js
cd ..
```

### 2. Start Backend Server (Port 5000)
```bash
cd backend
npm run dev
```

### 3. Start Frontend Dev Server (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## Demo Credentials

The seeded database contains ready-to-test accounts for all roles:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Organizer** | `organizer@hack.com` | `password123` | Event host; full administrative & publish controls |
| **Judge 1** | `judge1@hack.com` | `password123` | Assigned judge; scores projects with rubrics |
| **Judge 2** | `judge2@hack.com` | `password123` | Assigned judge; scores projects with rubrics |
| **Participant** | `alice@hack.com` | `password123` | Leader of team *NeuralPulse* |
| **Participant** | `bob@hack.com` | `password123` | Member of team *NeuralPulse* |
| **Participant** | `charlie@hack.com` | `password123` | Leader of team *QuantumLeap* |
| **Participant** | `dana@hack.com` | `password123` | Member of team *QuantumLeap* |

> **Pro Tip**: The application UI also includes a **"One-Click Role Demonstration"** on the Sign In screen to switch between Organizer, Judge, and Participant roles instantly.

---

## Running the Automated Test Suite

```bash
# Run all tests (34 tests covering auth, events, teams, submissions, and integration)
npm test
```

All tests execute in ~1 second against the real backend server and SQLite database.
