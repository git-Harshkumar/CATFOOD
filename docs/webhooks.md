# CATFOOD Outbound Webhooks System

## Overview
CATFOOD provides an enterprise-grade outbound webhook system enabling external platforms to subscribe to real-time hackathon lifecycle events. The architecture features:
- **SSRF Defense:** Strict validation blocking loopback, RFC-1918 private IPv4 subnets, link-local metadata endpoints (`169.254.169.254`), and IPv6 private addresses.
- **Asynchronous Outbox Pattern:** Webhook delivery is decoupled from primary request transactions via the `WebhookDelivery` outbox table and worker.
- **Cryptographic Signatures:** Every dispatch is signed using HMAC-SHA256 with timestamp verification headers.
- **Exponential Backoff Retries:** Failed deliveries automatically retry over 5 progressive intervals with full attempt auditing.
- **Masked Secrets:** Raw webhook secrets are returned strictly once during creation and masked everywhere else.

---

## Headers & Signature Verification
Every outbound HTTP POST request sent to your webhook URL includes three security headers:

| Header | Description |
| :--- | :--- |
| `X-Webhook-ID` | Unique delivery record identifier |
| `X-Webhook-Timestamp` | Unix epoch timestamp (seconds) when the payload was dispatched |
| `X-Webhook-Signature` | Hex-encoded HMAC-SHA256 signature |

### Signature Verification Algorithm
1. Extract `X-Webhook-Timestamp` and `X-Webhook-Signature`.
2. Construct the signature payload: `timestamp + "." + rawRequestBody`.
3. Compute `HMAC_SHA256(secret, signaturePayload)` in hexadecimal format.
4. Perform a timing-safe equality comparison between the computed hash and `X-Webhook-Signature`.
5. Verify that `Math.abs(Date.now() / 1000 - timestamp) < 300` (5-minute tolerance against replay attacks).

```javascript
// Node.js verification example
const crypto = require('crypto');

function verifyWebhook(payload, signature, timestamp, secret) {
  const message = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(message).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
```

---

## Retry Strategy & Exponential Backoff
When an endpoint responds with HTTP 4xx, 5xx, or times out (> 10s):
- **Attempt 1:** Immediate
- **Attempt 2:** ~1 minute
- **Attempt 3:** ~5 minutes
- **Attempt 4:** ~15 minutes
- **Attempt 5:** ~60 minutes

After 5 failed attempts, the delivery status is marked as `FAILED` and `failureCount` on the webhook is incremented.

---

## Event Catalog
CATFOOD emits typed payloads conforming to the `catfood.event.v1` envelope:
- `event.created`, `event.updated`, `event.published`, `event.closed`
- `submission.created`, `submission.updated`, `submission.submitted`
- `team.created`
- `judge.invited`, `judge.assigned`, `judge.status_updated`
- `score.submitted`, `judging.normalized`, `leaderboard.published`
- `vote.cast`, `comment.created`
- `certificate.issued`, `certificate.revoked`
- `bulk.import_completed`, `bulk.export_generated`
- `webhook.test`
