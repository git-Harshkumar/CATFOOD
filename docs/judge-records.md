# Cryptographically Signed Judge Participation Records

## Overview
CATFOOD provides cryptographically verifiable credentials certifying that an expert evaluated hackathon submissions.
In legacy systems, credentials were authenticated with symmetric HMAC-SHA256 secrets, which meant anyone with verification credentials could forge records. CATFOOD replaces HMAC with **Ed25519 digital signatures** adhering to **RFC 8785 JSON Canonicalization Scheme (JCS)**.

---

## Canonical Record Architecture
To guarantee deterministic signature generation across different platforms and JSON serialization engines, judge records follow RFC 8785:
- Object keys are lexicographically sorted in UTF-16 code unit order.
- No insignificant whitespace.
- Numbers and floats are canonicalized without trailing decimals.
- Date objects are converted to ISO 8601 strings.

### Payload Schema
```json
{
  "algorithm": "Ed25519",
  "event": {
    "id": 42,
    "title": "DOGFOOD 2026"
  },
  "issuedAt": "2026-09-29T18:00:00.000Z",
  "judge": {
    "name": "Prof. Alan Turing",
    "role": "JUDGE",
    "userId": 105
  },
  "keyId": "catfood-ed25519-v1-key",
  "participation": {
    "tracks": ["AI & Data", "Systems"],
    "verifiedEvaluationsCount": 14
  },
  "recordId": "rec_j_42_105_7a9f",
  "recordType": "JUDGE_PARTICIPATION_CREDENTIAL",
  "version": 1
}
```

---

## Multi-Event Disambiguation
A common defect in earlier hackathon platforms was querying judge records by `email + role` alone, which arbitrarily returned the first certificate found when a judge participated in multiple events.

CATFOOD strictly solves this:
1. Each record has a deterministic, globally unique `recordId` (`rec_j_<eventId>_<userId>_<hash>`).
2. When querying by user ID (`GET /api/certificates/judge/:userId/verify`), callers can supply `?eventId=42` to verify participation for a specific event.

---

## Verification Key Registry
Verifiers can fetch public keys without authentication:
```http
GET /.well-known/signing-keys
```
or
```http
GET /api/signing-keys
```

Response:
```json
{
  "success": true,
  "keys": [
    {
      "keyId": "catfood-ed25519-v1-key",
      "algorithm": "Ed25519",
      "publicKey": "MCowBQYDK2VwAyEAXy8tV...",
      "status": "ACTIVE",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```
Historical public keys are retained permanently in retired status, ensuring that older signed records remain verifiable indefinitely.
