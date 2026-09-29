# CATFOOD Security & Threat Model

## 1. Threat Vectors & Defenses

### 1. Server-Side Request Forgery (SSRF)
- **Threat:** Malicious organizer registers internal IP or cloud metadata URL (`http://169.254.169.254/...`) as a webhook.
- **Defense:**
  1. URL scheme restricted to HTTPS (or HTTP in local dev).
  2. Hostname resolved to IP before connection.
  3. Strict rejection of private IPv4/IPv6 CIDRs:
     - `127.0.0.0/8` (Loopback)
     - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (Private RFC 1918)
     - `169.254.0.0/16` (Link-local / Cloud Metadata)
     - `::1`, `fc00::/7`, `fe80::/10` (IPv6 private/link-local)
  4. Webhook URL re-validated immediately before HTTP dispatch to prevent DNS rebinding.

### 2. Cryptographic Digital Signatures & Key Isolation
- **Threat:** Shared verification secret allows third parties or verifiers to forge participation certificates and judge credentials.
- **Defense:**
  1. Asymmetric `Ed25519` key pairs replace symmetric HMAC.
  2. Private signing keys are loaded from secure environment configuration or isolated key vault; private keys are NEVER stored in database or sent over API.
  3. Public keys are registered in `SigningKey` table and exposed via `GET /.well-known/signing-keys` for offline independent verification.
  4. Records include unique `keyId` allowing historical verification after key rotation.

### 3. Cross-Tenant Data Isolation (Embed & Multi-Tenancy)
- **Threat:** Manipulating `eventId` query parameters or supplying nonexistent IDs leaks event #1 or private events.
- **Defense:**
  1. All public gallery and embed routes strictly verify `event.status === 'PUBLISHED'` and `event.isPublic === true`.
  2. If `eventId` is nonexistent or private, system returns strict `404 Not Found`. Never fall back to other events.
  3. Embed gallery widget reads specific `data-event-id` from script tag context.

### 4. Bulk Import Transaction Atomicity & Formula Injection (CSV Injection)
- **Threat:** Partial import leaves corrupted database state; importing malicious text strings triggers command execution when exported to spreadsheets.
- **Defense:**
  1. All bulk imports execute inside atomic `prisma.$transaction`. If any row fails, zero changes are committed.
  2. All exported and imported string fields are sanitized against spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) by prepending a single quote `'`.
  3. Hardcoded default passwords (`password123`) are removed; accounts use one-time cryptographic invite tokens or random temporary credentials.

### 5. Unified Authorization & Least Privilege
- **Threat:** Co-organizers locked out while event owners bypass checks; judges inspecting peer scores.
- **Defense:**
  1. Centralized `canManageEvent(user, eventId)` checks both `event.organizerId === user.id` AND `EventMember(role = 'ORGANIZER')`.
  2. Strict IDOR protection on submissions, teams, and judge score queues.
