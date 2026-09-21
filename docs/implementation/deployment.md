# Implementation Guide — Deployment & Development Guide

## 1. Prerequisites

- **Node.js**: v20.x or v22.x / v24.x
- **npm**: v10.x or higher

---

## 2. Installation & Setup

### Clone and Install Dependencies
From the repository root:
```bash
# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

---

## 3. Database Initialization & Seeding

```bash
cd backend

# Initialize SQLite database using Prisma
npx prisma db push

# Generate Prisma client
npx prisma generate

# Populate database with realistic demo hackathons, judges, teams, and scores
node prisma/seed.js

cd ..
```

---

## 4. Running Local Development Servers

In two separate terminals:

### Terminal 1: Backend Server (Nodemon + Express)
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

### Terminal 2: Frontend Server (Vite + React)
```bash
cd frontend
npm run dev
# Application runs on http://localhost:5173
```

---

## 5. Running Automated Test Suites

From the repository root:
```bash
# Run all test suites across auth, events, teams, submissions, and integration
npm test

# Or run specific test targets:
npm run test:auth
npm run test:events
npm run test:teams
npm run test:submissions
npm run test:integration
```

---

## 6. Production Bundle Build

To build the optimized static assets for the frontend:
```bash
cd frontend
npm run build
```
Built assets will be output to `frontend/dist/`.
