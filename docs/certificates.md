# CATFOOD Digital Certificates & Public Verification

## Overview
CATFOOD provides cryptographically signed digital certificates for hackathon participants, finalists, winners, and judges.
Unlike legacy HMAC certificates, CATFOOD uses **Ed25519 asymmetric digital signatures** and generates standalone, tamper-evident SVG vector artifacts.

---

## Security Model
1. **Asymmetric Signing:** Private signing keys reside strictly on the server and are never stored in plain text or shared with clients.
2. **Key Rotation & Registry:** All public keys are discoverable via `/.well-known/signing-keys` with immutable `keyId` identifiers.
3. **Privacy & PII Protection:** The public verification API (`/api/certificates/verify/:id`) redacts sensitive information. Recipient email is partially masked (`j***@example.com`) and private event IDs are hidden.
4. **Standalone SVG Artifacts:** Certificates are rendered as pure SVG vector graphics with HTML-escaped text to prevent stored XSS. They can be downloaded and displayed independently of the database.
5. **Revocation State Machine:** Certificates can transition from `ACTIVE` to `REVOKED` by authorized organizers. Revocation is permanent, audited with timestamp and reason, and immediately causes public verification to fail.

---

## Certificate Issuance
Organizers and Co-Organizers can issue certificates via:
```http
POST /api/certificates/:eventId/issue
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "recipientName": "Vansh Developer",
  "recipientEmail": "vansh@example.com",
  "role": "WINNER",
  "metadata": {
    "award": "1st Place Grand Prize",
    "track": "AI Innovation"
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "cert_c2d0f...",
    "recipientName": "Vansh Developer",
    "role": "WINNER",
    "algorithm": "Ed25519",
    "keyId": "catfood-ed25519-v1-key",
    "signature": "c8f2a...",
    "status": "ACTIVE",
    "artifactPath": "/storage/artifacts/certificates/42/cert_c2d0f.svg"
  }
}
```

---

## Public Verification Endpoint
Anyone with a certificate ID or scanning the certificate QR code can verify authenticity:
```http
GET /api/certificates/verify/cert_c2d0f...
```

Response:
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "isAuthentic": true,
    "status": "OFFICIALLY_VERIFIED",
    "verificationAlgorithm": "Ed25519",
    "keyId": "catfood-ed25519-v1-key",
    "certificateId": "cert_c2d0f...",
    "recipient": "Vansh Developer",
    "recipientEmailMasked": "v***@example.com",
    "event": "DOGFOOD 2026",
    "type": "WINNER",
    "issuedAt": "2026-09-29T18:00:00.000Z"
  }
}
```

If the certificate was revoked:
```json
{
  "success": true,
  "data": {
    "isValid": false,
    "isAuthentic": true,
    "status": "REVOKED",
    "revocationReason": "Award reassigned due to eligibility rule violation",
    "revokedAt": "2026-09-29T19:30:00.000Z"
  }
}
```
