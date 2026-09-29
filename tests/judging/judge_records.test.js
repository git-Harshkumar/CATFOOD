const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');
const prisma = require('../../backend/src/utils/prisma');

describe('Capability 4: Cryptographically Signed Judge Participation Records (Ed25519)', () => {
  let organizerToken;
  let judgeUser;
  let eventA;
  let eventB;

  before(async () => {
    await startTestServer();
    organizerToken = await login('organizer@hack.com');

    // Create judge user
    judgeUser = await prisma.user.upsert({
      where: { email: 'judge.ed25519@example.com' },
      update: {},
      create: {
        email: 'judge.ed25519@example.com',
        name: 'Judge Turing',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
      },
    });

    // Create Event A
    eventA = await prisma.event.create({
      data: {
        title: 'Ed25519 Hackathon Alpha',
        description: 'First event for multi-event judge test',
        startDate: new Date(),
        deadline: new Date(Date.now() + 86400000),
        status: 'PUBLISHED',
        organizer: { connect: { email: 'organizer@hack.com' } },
        judges: {
          create: [{ userId: judgeUser.id }],
        },
      },
    });

    // Create Event B
    eventB = await prisma.event.create({
      data: {
        title: 'Ed25519 Hackathon Beta',
        description: 'Second event for multi-event judge test',
        startDate: new Date(),
        deadline: new Date(Date.now() + 86400000),
        status: 'PUBLISHED',
        organizer: { connect: { email: 'organizer@hack.com' } },
        judges: {
          create: [{ userId: judgeUser.id }],
        },
      },
    });
  });

  after(async () => {
    if (judgeUser) {
      await prisma.certificate.deleteMany({ where: { recipientEmail: judgeUser.email } });
    }
    if (eventA) await prisma.event.delete({ where: { id: eventA.id } }).catch(() => {});
    if (eventB) await prisma.event.delete({ where: { id: eventB.id } }).catch(() => {});
    await stopTestServer();
  });

  test('Public Key Registry: Exposes active Ed25519 public keys without leaking private keys', async () => {
    // Test /.well-known/signing-keys
    const wellKnownRes = await request('/.well-known/signing-keys');
    assert.strictEqual(wellKnownRes.status, 200);
    assert.strictEqual(wellKnownRes.body.algorithm, 'Ed25519');
    assert.strictEqual(Array.isArray(wellKnownRes.body.keys), true);
    assert.strictEqual(wellKnownRes.body.keys.length >= 1, true);

    const key = wellKnownRes.body.keys[0];
    assert.ok(key.keyId, 'keyId must be exposed');
    assert.ok(key.publicKey, 'publicKey in PEM format must be exposed');
    assert.strictEqual(key.publicKey.includes('PUBLIC KEY'), true);
    assert.strictEqual(
      key.publicKey.includes('PRIVATE KEY'),
      false,
      'Private key must NEVER be exposed in public key registry'
    );

    // Test /api/signing-keys alias
    const apiKeysRes = await request('/signing-keys');
    assert.strictEqual(apiKeysRes.status, 200);
    assert.strictEqual(apiKeysRes.body.keys.length >= 1, true);
  });

  test('Judge Record Issuance: Signs canonical deterministic payload with active Ed25519 key', async () => {
    // Issue judge record for Event A
    const resA = await request(`/certificates/judge-record/${eventA.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { judgeUserId: judgeUser.id },
    });

    assert.strictEqual(resA.status, 201);
    const recordA = resA.body.data;
    assert.strictEqual(recordA.recipientName, judgeUser.name);
    assert.strictEqual(recordA.role, 'JUDGE');
    assert.strictEqual(recordA.algorithm, 'Ed25519');
    assert.ok(recordA.keyId);
    assert.ok(recordA.signature);

    // Issue judge record for Event B
    const resB = await request(`/certificates/judge-record/${eventB.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { judgeUserId: judgeUser.id },
    });

    assert.strictEqual(resB.status, 201);
    const recordB = resB.body.data;
    assert.strictEqual(recordB.recipientName, judgeUser.name);
    assert.strictEqual(recordB.role, 'JUDGE');
    assert.notStrictEqual(recordA.id, recordB.id, 'Distinct events must produce distinct certificate records');
  });

  test('Multi-Event Judge Resolution: Querying with eventId resolves the correct event participation record', async () => {
    // Verify Event A record explicitly
    const verifyARes = await request(`/certificates/judge/${judgeUser.id}/verify?eventId=${eventA.id}`);
    assert.strictEqual(verifyARes.status, 200);
    const vDataA = verifyARes.body.data;
    assert.strictEqual(vDataA.isValid, true);
    assert.strictEqual(vDataA.isAuthentic, true);
    assert.strictEqual(vDataA.eventName, eventA.title);
    assert.strictEqual(vDataA.verificationAlgorithm, 'Ed25519');

    // Verify Event B record explicitly
    const verifyBRes = await request(`/certificates/judge/${judgeUser.id}/verify?eventId=${eventB.id}`);
    assert.strictEqual(verifyBRes.status, 200);
    const vDataB = verifyBRes.body.data;
    assert.strictEqual(vDataB.isValid, true);
    assert.strictEqual(vDataB.isAuthentic, true);
    assert.strictEqual(vDataB.eventName, eventB.title);
    assert.strictEqual(vDataB.verificationAlgorithm, 'Ed25519');
  });

  test('Tamper Resistance: Modifying record signature or metadata breaks cryptographic verification', async () => {
    // Find record for Event A
    const cert = await prisma.certificate.findFirst({
      where: { eventId: eventA.id, recipientEmail: judgeUser.email },
    });
    assert.ok(cert);

    // Tamper with the digital signature
    const originalSig = cert.signature;
    const tamperedSig = originalSig.slice(0, -6) + 'abcdef';
    await prisma.certificate.update({
      where: { id: cert.id },
      data: { signature: tamperedSig },
    });

    // Verification must now fail
    const tamperedRes = await request(`/certificates/verify/${cert.id}`);
    assert.strictEqual(tamperedRes.status, 200);
    assert.strictEqual(tamperedRes.body.data.isValid, false, 'Tampered record must fail validation');
    assert.strictEqual(tamperedRes.body.data.isAuthentic, false);
    assert.strictEqual(tamperedRes.body.data.status, 'SIGNATURE_MISMATCH');

    // Restore signature
    await prisma.certificate.update({
      where: { id: cert.id },
      data: { signature: originalSig },
    });
  });
});
