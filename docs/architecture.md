# CATFOOD Platform Architecture

## 1. System Overview
The **DOGFOOD 2026 Hackathon Judgment Platform (CATFOOD)** is an enterprise hackathon management and multi-criterion judgment system built with Node.js, Express, React (Vite), Prisma ORM, and SQLite.

## 2. Component Architecture

```mermaid
graph TD
    Client[Web Frontend / External API Client] -->|HTTP / JSON| Router[Express API Gateway]
    
    subgraph Middleware Pipeline
        Router --> AuthMiddleware[JWT Authentication]
        AuthMiddleware --> RoleMiddleware[Role RBAC & Scope]
        RoleMiddleware --> RateLimiter[In-Memory / Token Bucket Limiter]
        RateLimiter --> Validator[Request Validation Layer]
    end

    subgraph Controller & Service Layer
        Validator --> EventCtrl[Event Controller]
        Validator --> JudgingCtrl[Judging & Normalization Controller]
        Validator --> CommunityCtrl[Community Voting & Comments Controller]
        Validator --> WebhookCtrl[Webhook Outbox Controller]
        Validator --> CertCtrl[Certificate & Record Controller]
        Validator --> BulkCtrl[Bulk Import / Export Controller]
        Validator --> EmbedCtrl[Embeddable Gallery Controller]
        
        EventCtrl --> EventService[Event Service]
        JudgingCtrl --> JudgingService[Bradley-Terry & Normalization Service]
        CommunityCtrl --> CommunityService[Quadratic Voting Service]
        WebhookCtrl --> WebhookService[Webhook Dispatch & Worker]
        CertCtrl --> CertService[Ed25519 & Credential Service]
        BulkCtrl --> BulkService[Bulk Transaction & Portability Service]
    end

    subgraph Persistence Layer
        EventService --> Prisma[Prisma ORM Client]
        JudgingService --> Prisma
        CommunityService --> Prisma
        WebhookService --> Prisma
        CertService --> Prisma
        BulkService --> Prisma
        Prisma --> DB[(SQLite Database / dev.db)]
    end

    subgraph Asynchronous Infrastructure
        WebhookService --> EventBus[Webhook Event Bus]
        EventBus --> OutboxQueue[Outbox / Async Delivery Worker]
        OutboxQueue -->|HMAC Signed POST| ExternalWebhooks[External Endpoints]
        BulkService --> FileStorage[Isolated Storage: /storage/artifacts]
        CertService --> FileStorage
    end
```

## 3. Request Flow & Execution Stages
1. **Transport & Entrypoint:** Incoming requests hit `backend/src/server.js`, which applies CORS, URL encoding, JSON body parsing, and routing.
2. **Authentication:** `authMiddleware.js` extracts Bearer JWT tokens from headers or cookies, decodes the payload, and verifies the user's presence in SQLite.
3. **Authorization:** Centralized permission checks via `canManageEvent(currentUser, eventId)` enforce tenant scoping across Global Admins, Event Creators, Co-Organizers, Judges, and Participants.
4. **Controllers & Validation:** Controllers unpack `params`, `query`, and `body`, run schema validations, and delegate business logic to dedicated services.
5. **Services:** Core business logic (Bradley-Terry estimation, z-score normalization, quadratic voting math, cryptographic signing, transactional imports).
6. **Persistence & Transactions:** Prisma client connects to SQLite, utilizing `prisma.$transaction` for multi-table atomic consistency.
7. **Outbound Dispatch:** Lifecycle actions publish events to `WebhookEventBus`, which stages delivery records in the outbox table for reliable processing.
