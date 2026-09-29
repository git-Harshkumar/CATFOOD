const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');
const prisma = require('../../backend/src/utils/prisma');

describe('Capability 3: Certificate Generation, Verification & Revocation', () => {
  let organizerToken;
  let participantToken;
  let testEvent;

  before(async () => {
    await startTestServer();
    organizerToken = await login('organizer@hack.com');
    participantToken = await login('alice@hack.com');

    testEvent = await prisma.event.create({
      data: {
        title: 'Certificate Test Hackathon 2026',
        description: 'Testing Ed25519 certificates, SVG artifacts and revocation',
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
    if (testEvent) {
      await prisma.certificate.deleteMany({ where: { eventId: testEvent.id } });
      await prisma.event.delete({ where: { id: testEvent.id } }).catch(() => {});
    }
    await stopTestServer();
  });

  test('Authorization: Non-organizer cannot issue certificates', async () => {
    const res = await request(`/certificates/${testEvent.id}/issue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participantToken}` },
      body: {
        recipientName: 'Alice Participant',
        recipientEmail: 'alice@example.com',
        role: 'PARTICIPANT',
      },
    });

    assert.strictEqual(res.status, 403, 'Participant must not issue certificates');
  });

  test('Issuance: Generates Ed25519 digital signature, keyId, and standalone SVG artifact', async () => {
    const res = await request(`/certificates/${testEvent.id}/issue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        recipientName: 'Vansh Developer <script>alert(1)</script>',
        recipientEmail: 'vansh.test@example.com',
        role: 'WINNER',
        metadata: { award: '1st Place Grand Prize' },
      },
    });

    assert.strictEqual(res.status, 201);
    const cert = res.body.data;
    assert.ok(cert.id, 'Certificate ID must be returned');
    assert.strictEqual(cert.role, 'WINNER');
    assert.strictEqual(cert.algorithm, 'Ed25519');
    assert.ok(cert.keyId, 'keyId must be populated for public key lookup');
    assert.ok(cert.signature, 'Asymmetric signature must be present');
    assert.strictEqual(cert.status, 'ACTIVE');

    // Verify SVG artifact was generated and stored on disk
    assert.ok(cert.artifactPath, 'artifactPath must be recorded');
    assert.strictEqual(fs.existsSync(cert.artifactPath), true, 'Artifact file must exist on disk');

    const svgContent = fs.readFileSync(cert.artifactPath, 'utf8');
    assert.strictEqual(svgContent.includes('<svg'), true, 'Artifact must be valid SVG');
    // Ensure XSS payload in recipient name was escaped
    assert.strictEqual(
      svgContent.includes('<script>'),
      false,
      'HTML/SVG tags in recipient name must be escaped'
    );
    assert.strictEqual(
      svgContent.includes('&lt;script&gt;'),
      true,
      'Escaped text must appear safely in artifact'
    );
  });

  test('Artifact Download Endpoint: Serves standalone SVG with correct MIME type', async () => {
    // Fetch certificate list to get the ID
    const listRes = await request(`/certificates/event/${testEvent.id}`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    assert.strictEqual(listRes.status, 200);
    const cert = listRes.body.data[0];

    const artifactRes = await request(`/certificates/${cert.id}/artifact`);
    assert.strictEqual(artifactRes.status, 200);
    assert.strictEqual(
      artifactRes.headers.get('content-type')?.includes('image/svg+xml'),
      true,
      'Must return image/svg+xml content type'
    );
    assert.strictEqual(artifactRes.text.includes('<svg'), true);
  });

  test('Public Verification: Verifies signature, masks PII, and returns safe DTO', async () => {
    const listRes = await request(`/certificates/event/${testEvent.id}`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    const cert = listRes.body.data[0];

    // Public verification without authentication
    const verifyRes = await request(`/certificates/verify/${cert.id}`);
    assert.strictEqual(verifyRes.status, 200);

    const result = verifyRes.body.data;
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.isAuthentic, true);
    assert.strictEqual(result.status, 'OFFICIALLY_VERIFIED');
    assert.strictEqual(result.verificationAlgorithm, 'Ed25519');
    assert.strictEqual(result.keyId, cert.keyId);

    // PII Redaction Check: Full email must NOT be exposed
    assert.strictEqual(
      result.recipientEmailMasked.includes('*'),
      true,
      `Expected masked email, got: ${result.recipientEmailMasked}`
    );
    assert.strictEqual(
      result.recipientEmailMasked.includes('vansh.test@example.com'),
      false,
      'Plaintext email must not be exposed to unauthenticated callers'
    );
  });

  test('Revocation Lifecycle: Revoked certificate fails verification with audit trail', async () => {
    const listRes = await request(`/certificates/event/${testEvent.id}`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    const cert = listRes.body.data[0];

    // Revoke certificate
    const revokeRes = await request(`/certificates/${cert.id}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { reason: 'Academic integrity breach investigation' },
    });

    assert.strictEqual(revokeRes.status, 200);
    assert.strictEqual(revokeRes.body.data.status, 'REVOKED');
    assert.strictEqual(
      revokeRes.body.data.revocationReason,
      'Academic integrity breach investigation'
    );

    // Verify after revocation
    const verifyAfterRevoke = await request(`/certificates/verify/${cert.id}`);
    assert.strictEqual(verifyAfterRevoke.status, 200);

    const vResult = verifyAfterRevoke.body.data;
    assert.strictEqual(vResult.isValid, false, 'Revoked certificate must not be valid');
    assert.strictEqual(vResult.status, 'REVOKED');
    assert.strictEqual(
      vResult.revocation?.reason,
      'Academic integrity breach investigation'
    );
    assert.ok(vResult.revocation?.revokedAt, 'Revocation timestamp must be provided');
  });
});
