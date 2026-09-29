# CATFOOD Data Model Specification

## 1. Core Entity Relationship Diagram

```mermaid
erDiagram
    Event ||--o{ Track : "has"
    Event ||--o{ Criterion : "defines"
    Event ||--o{ Team : "hosts"
    Event ||--o{ EventMember : "registers"
    Event ||--o{ Judge : "appoints"
    Event ||--o{ Webhook : "configures"
    Event ||--o{ Certificate : "issues"
    Event ||--o{ ImportJob : "tracks"
    Event ||--o{ ExportJob : "tracks"
    
    Team ||--o{ TeamMember : "comprises"
    Team ||--o| Submission : "submits"
    
    Submission ||--o{ Score : "evaluated_by"
    Submission ||--o{ CommunityVote : "receives"
    Submission ||--o{ Comment : "has"
    
    Webhook ||--o{ WebhookDelivery : "dispatches"
```

## 2. Infrastructure & Hardened Models (Phase 2 Additions)

### Webhook & WebhookDelivery
- `Webhook`: Endpoint configuration with `isActive`, `failureCount`, secret hash/token, and topic subscriptions.
- `WebhookDelivery`: Individual delivery attempts tracking `id`, `webhookId`, `eventType`, `payload`, `responseStatus`, `responseBody`, `durationMs`, `status` (`PENDING`, `SUCCESS`, `FAILED`), `attempts`, `nextRetryAt`.

### Certificate
- Fields: `id`, `eventId`, `recipientName`, `recipientEmail`, `role`, `signature`, `metadata`, `issuedAt`, `status` (`ACTIVE`, `REVOKED`), `revokedAt`, `revokedBy`, `revocationReason`, `keyId`, `algorithm` (`Ed25519`), `artifactPath`.

### SigningKey
- Fields: `id`, `keyId`, `algorithm`, `publicKey`, `status` (`ACTIVE`, `RETIRED`), `createdAt`, `activatedAt`, `retiredAt`. Stores public cryptographic keys for signature verification.

### ImportJob & ExportJob
- Fields: `id`, `eventId`, `type`, `status` (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`), `progress`, `totalItems`, `processedItems`, `errorCount`, `errorLog`, `artifactPath`, `createdBy`, `createdAt`, `completedAt`.

### EmbedConfig
- Embed configuration per event: `theme`, `layout`, `pageSize`, `allowFiltering`, `allowSearch`, `showScores`, `customCss`.
