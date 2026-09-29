const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');
const prisma = require('../../backend/src/utils/prisma');

describe('Capability 5: Embeddable Public Gallery Widget & Tenant Isolation', () => {
  let organizerToken;
  let publicEvent;
  let privateEvent;

  before(async () => {
    await startTestServer();
    organizerToken = await login('organizer@hack.com');

    // Create public published event
    publicEvent = await prisma.event.create({
      data: {
        title: 'Public Embed Hackathon 2026',
        description: 'An open event with an embeddable gallery',
        startDate: new Date(),
        deadline: new Date(Date.now() + 86400000),
        status: 'PUBLISHED',
        organizer: { connect: { email: 'organizer@hack.com' } },
      },
    });

    const team = await prisma.team.create({
      data: {
        event: { connect: { id: publicEvent.id } },
        name: 'Team Alpha',
        inviteCode: 'team-alpha-embed-code',
        leader: { connect: { email: 'organizer@hack.com' } },
      },
    });

    await prisma.submission.create({
      data: {
        event: { connect: { id: publicEvent.id } },
        team: { connect: { id: team.id } },
        title: 'Embed Project Alpha',
        tagline: 'First public submission',
        description: 'Visible in gallery',
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Create private draft event (must NOT be embeddable)
    privateEvent = await prisma.event.create({
      data: {
        title: 'Secret Internal Hackathon 2026',
        description: 'Private draft event with secret projects',
        startDate: new Date(),
        deadline: new Date(Date.now() + 86400000),
        status: 'DRAFT',
        organizer: { connect: { email: 'organizer@hack.com' } },
      },
    });
  });

  after(async () => {
    if (publicEvent) {
      await prisma.submission.deleteMany({ where: { eventId: publicEvent.id } });
      await prisma.team.deleteMany({ where: { eventId: publicEvent.id } });
      await prisma.embedConfig.deleteMany({ where: { eventId: publicEvent.id } });
      await prisma.event.delete({ where: { id: publicEvent.id } }).catch(() => {});
    }
    if (privateEvent) {
      await prisma.event.delete({ where: { id: privateEvent.id } }).catch(() => {});
    }
    await stopTestServer();
  });

  test('Fallback Removal: Non-existent or invalid event ID returns 404 (NEVER Event #1)', async () => {
    // Missing event or invalid id
    const res9999 = await request('/embed/gallery/999999');
    assert.strictEqual(
      res9999.status,
      404,
      'Invalid event ID must return 404, not fall back to event #1'
    );

    const resInvalid = await request('/embed/gallery/not-a-valid-id');
    assert.strictEqual(resInvalid.status, 404);

    const resData404 = await request('/embed/gallery/999999/data');
    assert.strictEqual(resData404.status, 404);
  });

  test('Tenant Isolation: Private or Draft events cannot be embedded', async () => {
    const resPrivate = await request(`/embed/gallery/${privateEvent.id}`);
    assert.strictEqual(
      resPrivate.status,
      404,
      'Private/Draft event gallery must return 404 to public requests'
    );

    const resDataPrivate = await request(`/embed/gallery/${privateEvent.id}/data`);
    assert.strictEqual(resDataPrivate.status, 404);
  });

  test('Published Public Event: Serves HTML with security headers and caching', async () => {
    const res = await request(`/embed/gallery/${publicEvent.id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type')?.includes('text/html'), true);

    // Verify security headers
    const csp = res.headers.get('content-security-policy');
    assert.ok(csp, 'CSP header must be set');
    assert.strictEqual(csp.includes('frame-ancestors *'), true, 'Must allow embedding');

    const cacheControl = res.headers.get('cache-control');
    assert.ok(cacheControl, 'Cache-Control header must be set');
  });

  test('JSON DTO Endpoint: Returns sanitized public gallery data with pagination', async () => {
    const res = await request(`/embed/gallery/${publicEvent.id}/data?page=1&limit=10`);
    assert.strictEqual(res.status, 200);

    const data = res.body.data;
    assert.strictEqual(data.event?.id, publicEvent.id);
    assert.strictEqual(data.event?.title, publicEvent.title);
    assert.ok(data.pagination, 'Pagination metadata must be present');
    assert.strictEqual(Array.isArray(data.submissions), true);
    assert.strictEqual(data.submissions.length >= 1, true);

    const project = data.submissions[0];
    assert.strictEqual(project.title, 'Embed Project Alpha');
    assert.strictEqual(project.team?.name, 'Team Alpha');
    // Ensure internal sensitive details are NOT in DTO
    assert.strictEqual(project.judgeScores, undefined);
    assert.strictEqual(project.organizerNotes, undefined);
  });

  test('Dynamic Script Widget: Serves JS reading data-event-id attribute', async () => {
    const res = await request('/embed/gallery.js');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type')?.includes('javascript'), true);
    assert.strictEqual(res.text.includes('data-event-id'), true);
    assert.strictEqual(res.text.includes('/api/embed/gallery/'), true);
  });

  test('Embed Configuration: Organizer can view and update gallery customization', async () => {
    // Get initial config
    const getRes = await request(`/embed/${publicEvent.id}/config`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    assert.strictEqual(getRes.status, 200);
    assert.ok(getRes.body.data);

    // Update config
    const updateRes = await request(`/embed/${publicEvent.id}/config`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        theme: 'dark',
        layout: 'list',
        pageSize: 12,
        showTracks: false,
        showTeam: true,
      },
    });

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.data.theme, 'dark');
    assert.strictEqual(updateRes.body.data.layout, 'list');
    assert.strictEqual(updateRes.body.data.pageSize, 12);
    assert.strictEqual(updateRes.body.data.showTracks, false);
  });
});
