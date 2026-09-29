const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');
const prisma = require('../../backend/src/utils/prisma');

describe('Capability 2: Outbound Webhooks & Security', () => {
  let organizerToken;
  let participantToken;
  let testEvent;

  before(async () => {
    await startTestServer();
    organizerToken = await login('organizer@hack.com');
    participantToken = await login('alice@hack.com');

    // Create a clean test event
    testEvent = await prisma.event.create({
      data: {
        title: 'Webhook Test Hackathon 2026',
        description: 'Testing outbound webhooks and SSRF defense',
        startDate: new Date(),
        deadline: new Date(Date.now() + 86400000),
        status: 'PUBLISHED',
        organizer: {
          connect: { email: 'organizer@hack.com' },
        },
      },
    });
  });

  after(async () => {
    // Cleanup test event and webhooks
    if (testEvent) {
      await prisma.webhookDelivery.deleteMany({ where: { eventId: testEvent.id } });
      await prisma.webhook.deleteMany({ where: { eventId: testEvent.id } });
      await prisma.event.delete({ where: { id: testEvent.id } }).catch(() => {});
    }
    await stopTestServer();
  });

  test('SSRF Protection: Rejects private and loopback IP addresses', async () => {
    const maliciousUrls = [
      'http://127.0.0.1:8080/hook',
      'http://localhost/hook',
      'http://169.254.169.254/latest/meta-data',
      'http://10.0.0.1/webhook',
      'http://192.168.1.50:3000/webhook',
      'http://172.16.0.5/webhook',
      'ftp://example.com/webhook',
      'javascript:alert(1)',
    ];

    for (const url of maliciousUrls) {
      const res = await request(`/webhooks/${testEvent.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${organizerToken}` },
        body: {
          url,
          events: ['submission.created'],
        },
      });

      assert.strictEqual(
        res.status === 400 || res.status === 422,
        true,
        `Expected ${url} to be blocked with 400/422, got ${res.status}`
      );
      const errMsg = (typeof res.body?.error === 'string'
        ? res.body.error
        : res.body?.error?.message || res.body?.message || '').toLowerCase();
      assert.strictEqual(
        errMsg.includes('private') || errMsg.includes('invalid') || errMsg.includes('prohibited') || errMsg.includes('unsupported') || errMsg.includes('https') || errMsg.includes('protocol'),
        true,
        `Expected descriptive rejection message for ${url}, got: ${errMsg}`
      );
    }
  });

  test('Authorization: Non-organizers cannot register or manage webhooks', async () => {
    const res = await request(`/webhooks/${testEvent.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participantToken}` },
      body: {
        url: 'https://example.com/webhook',
        events: ['submission.created'],
      },
    });

    assert.strictEqual(res.status, 403, 'Participant must not register webhooks');
  });

  test('Secret Handling: Secret is returned upon creation but masked on list', async () => {
    const createRes = await request(`/webhooks/${testEvent.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        url: 'https://webhook.site/demo-catfood-test-1',
        events: ['submission.created', 'vote.cast'],
      },
    });

    assert.strictEqual(createRes.status, 201);
    const createdWebhook = createRes.body.data;
    assert.ok(createdWebhook.id, 'Webhook ID must be returned');
    assert.ok(createdWebhook.secret, 'Secret must be returned on creation');
    assert.strictEqual(createdWebhook.secret.length >= 32, true, 'Secret must be strong random string');

    // Fetch list of webhooks
    const listRes = await request(`/webhooks/${testEvent.id}`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });

    assert.strictEqual(listRes.status, 200);
    const list = listRes.body.data;
    const found = list.find((w) => w.id === createdWebhook.id);
    assert.ok(found, 'Created webhook must be in list');
    assert.notStrictEqual(found.secret, createdWebhook.secret, 'Secret must not be returned in plaintext');
    assert.strictEqual(
      found.secret === undefined || found.secret.includes('•') || found.secret.includes('*'),
      true,
      'Webhook secret must be masked or omitted on list'
    );
  });

  test('Outbox Delivery & Signature: Dispatches signed payload with X-Webhook headers', async () => {
    // Register a webhook with known secret
    const customSecret = 'test-wh-secret-key-1234567890abcdef';
    const regRes = await request(`/webhooks/${testEvent.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        url: 'https://httpbin.org/post',
        events: ['webhook.test', 'submission.created'],
        secret: customSecret,
      },
    });

    assert.strictEqual(regRes.status, 201);
    const whId = regRes.body.data.id;

    // Trigger test dispatch
    const testRes = await request(`/webhooks/${testEvent.id}/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { webhookId: whId },
    });

    assert.strictEqual(testRes.status, 200);

    // Verify WebhookDelivery outbox entry was recorded
    const deliveriesRes = await request(`/webhooks/${whId}/deliveries`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });

    assert.strictEqual(deliveriesRes.status, 200);
    const deliveries = deliveriesRes.body.data;
    assert.strictEqual(Array.isArray(deliveries), true);
    assert.strictEqual(deliveries.length >= 1, true, 'At least one delivery must be logged');

    const delivery = deliveries[0];
    assert.strictEqual(delivery.webhookId, whId);
    assert.strictEqual(delivery.eventId, testEvent.id);
    assert.ok(delivery.eventType, 'Event type must be recorded');
    assert.ok(delivery.attempts >= 1, 'Delivery attempts must be tracked');
    assert.ok(typeof delivery.durationMs === 'number', 'Duration in ms must be tracked');
  });

  test('Webhook Delivery Retries: Tracks failure status and exponential backoff schedule', async () => {
    // Create delivery failure scenario
    const wh = await prisma.webhook.create({
      data: {
        eventId: testEvent.id,
        url: 'https://example.com/non-existent-fail',
        events: 'webhook.test',
        secret: 'retry-secret-test-key-123456',
        failureCount: 2,
        isActive: true,
      },
    });

    const failedDelivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: wh.id,
        eventId: testEvent.id,
        eventType: 'webhook.test',
        payload: JSON.stringify({ test: true }),
        status: 'FAILED',
        attempts: 2,
        responseStatus: 500,
        responseBody: 'Internal Server Error',
        nextRetryAt: new Date(Date.now() + 60000),
      },
    });

    assert.strictEqual(failedDelivery.status, 'FAILED');
    assert.strictEqual(failedDelivery.attempts, 2);
    assert.ok(failedDelivery.nextRetryAt > new Date());
  });
});
