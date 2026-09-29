const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('../../backend/node_modules/bcryptjs');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');
const prisma = require('../../backend/src/utils/prisma');

describe('Capability 6: Bulk Operations, Portability & CSV Security', () => {
  let organizerToken;
  let testEvent;

  before(async () => {
    await startTestServer();
    organizerToken = await login('organizer@hack.com');

    // Create a complete test event with tracks and criteria
    testEvent = await prisma.event.create({
      data: {
        title: 'Portability & Bulk Test Hackathon 2026',
        description: 'Complete hackathon dataset for bundle testing',
        startDate: new Date(),
        deadline: new Date(Date.now() + 86400000),
        status: 'PUBLISHED',
        organizer: { connect: { email: 'organizer@hack.com' } },
        tracks: {
          create: [
            { name: 'AI Track', description: 'Machine learning projects' },
            { name: 'Web3 Track', description: 'Decentralized systems' },
          ],
        },
        criteria: {
          create: [
            { name: 'Technical Depth', weight: 1.5, maxScore: 10 },
            { name: 'Innovation', weight: 1.0, maxScore: 10 },
          ],
        },
      },
      include: { tracks: true, criteria: true },
    });
  });

  after(async () => {
    if (testEvent) {
      await prisma.submission.deleteMany({ where: { eventId: testEvent.id } });
      await prisma.team.deleteMany({ where: { eventId: testEvent.id } });
      await prisma.criterion.deleteMany({ where: { eventId: testEvent.id } });
      await prisma.track.deleteMany({ where: { eventId: testEvent.id } });
      await prisma.event.delete({ where: { id: testEvent.id } }).catch(() => {});
    }
    await stopTestServer();
  });

  test('Transactional Rollback: Invalid row in bulk import rolls back entire transaction', async () => {
    const existingTeamsCount = await prisma.team.count({ where: { eventId: testEvent.id } });

    // Payload where 2nd row is invalid (missing project title)
    const invalidBatch = {
      projects: [
        { teamName: 'Valid Team 1', title: 'Valid Project 1' },
        { teamName: 'Invalid Team 2', title: '' }, // Should trigger validation failure
      ],
    };

    const res = await request(`/bulk/${testEvent.id}/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: invalidBatch,
    });

    assert.strictEqual(
      res.status === 400 || res.status === 422,
      true,
      'Batch with invalid row must be rejected with 400/422'
    );

    // Verify 0 partial rows were committed to database
    const finalTeamsCount = await prisma.team.count({ where: { eventId: testEvent.id } });
    assert.strictEqual(
      finalTeamsCount,
      existingTeamsCount,
      'Transaction must rollback: no partial teams should be committed'
    );
  });

  test('Valid Bulk Import: Atomically commits valid batch with non-default credentials', async () => {
    const validBatch = {
      projects: [
        {
          teamName: 'Cyber Owls',
          title: 'Autonomous Drone Detection',
          description: 'A drone surveillance system',
          submitterEmail: 'owl.lead@hack.com',
          submitterName: 'Dr. Owl',
        },
        {
          teamName: 'Quantum Coders',
          title: 'Lattice Crypto Engine',
          description: 'Post-quantum key exchange',
          submitterEmail: 'quantum.coder@hack.com',
          submitterName: 'Alice Quantum',
        },
      ],
    };

    const res = await request(`/bulk/${testEvent.id}/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: validBatch,
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.importedCount, 2);

    // Verify submitter accounts were created WITHOUT the dangerous "password123" default
    const owlUser = await prisma.user.findUnique({ where: { email: 'owl.lead@hack.com' } });
    assert.ok(owlUser, 'User account must be created');
    assert.notStrictEqual(owlUser.passwordHash, undefined);

    // Verify password is NOT a hash of "password123"
    const isWeakDefault = await bcrypt.compare('password123', owlUser.passwordHash);
    assert.strictEqual(
      isWeakDefault,
      false,
      'Imported account must NOT have weak default password "password123"'
    );
  });

  test('CSV Formula Injection Defense: Sanitizes cells starting with =, +, -, @, \\t, \\r', async () => {
    // Create submission with formula injection payload
    const injectionTeam = await prisma.team.create({
      data: {
        name: '-DDE("cmd";"calc";"")',
        inviteCode: 'invite-dde-1',
        leader: { connect: { email: 'organizer@hack.com' } },
        event: { connect: { id: testEvent.id } },
      },
    });

    await prisma.submission.create({
      data: {
        title: '=cmd|"/C calc"!A0',
        tagline: '+HYPERLINK("http://evil.com","Click")',
        description: '@SUM(1+1)*cmd',
        status: 'SUBMITTED',
        submittedAt: new Date(),
        event: { connect: { id: testEvent.id } },
        team: { connect: { id: injectionTeam.id } },
      },
    });

    // Request judging CSV export
    const csvRes = await request(`/events/${testEvent.id}/judging/export.csv?type=submissions`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });

    assert.strictEqual(csvRes.status, 200);
    const csvText = csvRes.text;

    // Check that formula triggers have been neutralized with leading single quote
    assert.strictEqual(
      csvText.includes("'=cmd"),
      true,
      'Excel formula starting with = must be neutralized with leading quote'
    );
    assert.strictEqual(
      csvText.includes("'+HYPERLINK"),
      true,
      'Excel formula starting with + must be neutralized'
    );
    assert.strictEqual(
      csvText.includes("'-DDE"),
      true,
      'Excel formula starting with - must be neutralized'
    );
    assert.strictEqual(
      csvText.includes("'@SUM"),
      true,
      'Excel formula starting with @ must be neutralized'
    );
  });

  test('Versioned Event Bundle Export: Produces valid catfood-event-bundle v1 structure', async () => {
    const exportRes = await request(`/bulk/${testEvent.id}/export`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });

    assert.strictEqual(exportRes.status, 200);
    const bundle = exportRes.body.data || exportRes.body;

    assert.strictEqual(bundle.format, 'catfood-event-bundle');
    assert.strictEqual(bundle.exportVersion, 1);
    assert.ok(bundle.generatedAt);
    assert.ok(bundle.event);
    assert.strictEqual(bundle.event.title, testEvent.title);
    assert.strictEqual(Array.isArray(bundle.tracks), true);
    assert.strictEqual(bundle.tracks.length >= 2, true);
    assert.strictEqual(Array.isArray(bundle.criteria), true);
    assert.strictEqual(Array.isArray(bundle.teams), true);
    assert.strictEqual(Array.isArray(bundle.submissions), true);

    // Verify sensitive secrets are NOT present
    const serializedBundle = JSON.stringify(bundle);
    assert.strictEqual(serializedBundle.includes('passwordHash'), false, 'No password hashes in export');
    assert.strictEqual(serializedBundle.includes('webhookSecret'), false, 'No webhook secrets in export');
    assert.strictEqual(serializedBundle.includes('privateKey'), false, 'No private signing keys in export');
  });

  test('Full Round-Trip Bundle Importer: Restores exported bundle into a newly created event', async () => {
    // 1. Export current event bundle
    const exportRes = await request(`/bulk/${testEvent.id}/export`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    const exportedBundle = exportRes.body.data || exportRes.body;

    // Change title slightly for imported event
    exportedBundle.event.title = 'Restored Clone Event 2026';

    // 2. Import into platform
    const importRes = await request('/bulk/event/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { bundle: exportedBundle },
    });

    assert.strictEqual(importRes.status, 201);
    const restoredEvent = importRes.body.data;
    assert.ok(restoredEvent.id, 'New event ID must be generated');
    assert.strictEqual(restoredEvent.title, 'Restored Clone Event 2026');

    // 3. Verify all tracks and criteria were faithfully restored
    const fullRestored = await prisma.event.findUnique({
      where: { id: restoredEvent.id },
      include: { tracks: true, criteria: true, teams: true, submissions: true },
    });

    assert.strictEqual(fullRestored.tracks.length, exportedBundle.tracks.length);
    assert.strictEqual(fullRestored.criteria.length, exportedBundle.criteria.length);
    assert.strictEqual(fullRestored.teams.length, exportedBundle.teams.length);
    assert.strictEqual(fullRestored.submissions.length, exportedBundle.submissions.length);

    // Cleanup restored clone
    await prisma.submission.deleteMany({ where: { eventId: restoredEvent.id } });
    await prisma.team.deleteMany({ where: { eventId: restoredEvent.id } });
    await prisma.criterion.deleteMany({ where: { eventId: restoredEvent.id } });
    await prisma.track.deleteMany({ where: { eventId: restoredEvent.id } });
    await prisma.event.delete({ where: { id: restoredEvent.id } }).catch(() => {});
  });
});
