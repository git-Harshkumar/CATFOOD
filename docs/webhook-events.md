# CATFOOD Webhook Event Catalog

## 1. Outbound Webhook Protocol

### Headers
Every outbound webhook HTTP POST request includes standard security and idempotency headers:
- `Content-Type`: `application/json`
- `X-Webhook-ID`: UUIDv4 unique identifier for this specific delivery attempt
- `X-Webhook-Event`: The event topic (e.g. `submission.submitted`, `vote.cast`)
- `X-Webhook-Timestamp`: Unix timestamp (milliseconds) when delivery was initiated
- `X-Webhook-Signature`: HMAC-SHA256 signature calculated over `${timestamp}.${JSON_payload}` using the webhook endpoint's secret

### Replay & Deduplication
Receivers MUST:
1. Verify signature with constant-time equality: `crypto.timingSafeEqual(sig, expectedSig)`.
2. Reject requests older than 300 seconds (5 minutes) based on `X-Webhook-Timestamp`.
3. Deduplicate processing using `X-Webhook-ID`.

---

## 2. Event Catalog

### Event Management (`event.*`)
- `event.created`: Fired when a new hackathon event is initialized.
- `event.updated`: Fired when event details, rules, or dates change.
- `event.published`: Fired when event transitions to published / live status.
- `event.closed`: Fired when submission or judging period is concluded.

### Submissions & Teams (`submission.*`, `team.*`)
- `submission.created`: Fired when draft submission is created.
- `submission.updated`: Fired when project deliverables, links, or description are modified.
- `submission.submitted`: Fired when project is formally submitted before deadline.
- `team.created`: Fired when a new hackathon team is registered.
- `team.member_joined`: Fired when a participant joins via invite code.

### Judging & Scores (`judge.*`, `score.*`)
- `judge.invited`: Fired when judge invitation is sent with track assignments.
- `judge.status_updated`: Fired when judge accepts or declines invitation.
- `judge.assigned`: Fired when judge is assigned to evaluate a submission.
- `score.submitted`: Fired when judge submits criterion scores.
- `judging.normalized`: Fired when z-score normalization finishes.
- `leaderboard.published`: Fired when organizer unseals / reveals official rankings.

### Community & Certificates (`vote.*`, `certificate.*`)
- `vote.cast`: Fired when a community vote is successfully cast.
- `comment.created`: Fired when a project discussion comment is posted.
- `certificate.issued`: Fired when a verifiable credential is generated.
- `certificate.revoked`: Fired when a credential is invalidated.

### System & Bulk Operations (`bulk.*`, `webhook.*`)
- `bulk.import_completed`: Fired when bulk project or judge import finishes.
- `bulk.export_generated`: Fired when event archive bundle export finishes.
- `webhook.test`: Test payload dispatched on manual testing.

---

## 3. Canonical Payload Envelope
```json
{
  "id": "evt_01HXYZ7890123456",
  "eventId": 1,
  "eventType": "submission.submitted",
  "eventVersion": 1,
  "timestamp": 1790700365000,
  "data": {
    "submissionId": 42,
    "title": "Quantum Agent",
    "track": "AI & Systems",
    "teamId": 12,
    "submittedAt": "2026-09-29T20:00:00.000Z"
  }
}
```
