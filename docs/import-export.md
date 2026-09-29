# CATFOOD Bulk Operations, Portability & CSV Security

## Overview
CATFOOD provides complete organizer data portability, allowing hackathons to be exported into structured packages, migrated between server instances, and imported in bulk via atomic transactions.

---

## 1. CSV Formula Injection (DDE) Neutralization
When exporting judging results, scores, or participant rosters to CSV format:
- Attack vectors such as `=cmd|' /C calc'!A0`, `+cmd`, `-cmd`, `@SUM(...)`, `\t=...`, or `\r=...` could execute arbitrary programs or leak data when opened in Microsoft Excel or Google Sheets.
- **Defense:** Every cell value exported via `formatCsv` or `sanitizeCsvCell` is checked. If the first character matches any trigger character (`=`, `+`, `-`, `@`, `\t`, `\r`), a single quote (`'`) is prepended, forcing spreadsheet applications to treat the cell strictly as literal text.

---

## 2. Hardcoded Credentials Elimination
In legacy import scripts, newly created participant accounts were initialized with the default password `password123`, allowing immediate account takeover of hundreds of users.
- **Defense:** CATFOOD completely eliminated `password123`.
- During bulk import, every imported user is assigned a cryptographically random, high-entropy 16-byte temporary credential.
- Accounts require a password reset or invitation token verification before logging in.

---

## 3. Atomic Database Transactions
All bulk import operations (`POST /api/bulk/:eventId/import` and `POST /api/bulk/import/judges/:eventId`) execute within a `prisma.$transaction(...)` block.
- Pre-validation occurs before mutating the database.
- If even one row fails validation (e.g., missing project title, invalid email format, non-existent track), the entire transaction immediately rolls back.
- No partial or corrupted state remains in the database.

---

## 4. Versioned Event Bundle Format (`catfood-event-bundle` v1)
The platform defines a portable, versioned JSON export schema:
```json
{
  "format": "catfood-event-bundle",
  "exportVersion": 1,
  "generatedAt": "2026-09-29T18:00:00.000Z",
  "event": {
    "title": "DOGFOOD 2026",
    "description": "Annual flagship hackathon",
    "startDate": "...",
    "deadline": "..."
  },
  "tracks": [
    { "name": "AI Track", "description": "Machine learning innovations" }
  ],
  "criteria": [
    { "name": "Technical Depth", "weight": 1.5, "maxScore": 10 }
  ],
  "prizes": [],
  "teams": [],
  "submissions": [],
  "judges": [],
  "certificates": []
}
```

### Sensitive Data Exclusion
To prevent security leaks, the export bundle strictly omits:
- User password hashes (`passwordHash`)
- Webhook signing secrets (`webhookSecret`)
- Ed25519 private signing keys (`privateKey`)
- Active session tokens

### Blind Judging Anonymization
When `anonymizeJudges=true` or `blind=true` is specified, judge names and email addresses are replaced with anonymous identifiers (`Judge #1`, `Judge #2`), preserving evaluation integrity for academic or competitive research.

---

## 5. Round-Trip Bundle Importer
Organizers can re-import a previously exported `catfood-event-bundle` into a fresh event instance via:
```http
POST /api/bulk/event/import
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "bundle": { ... }
}
```
The importer automatically maps tracks, criteria, teams, and submissions, establishing clean foreign key relationships inside an atomic transaction.
