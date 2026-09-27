const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');

describe('Event Management & RBAC Suite', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  test('GET /api/events should return list of events to unauthenticated public', async () => {
    const res = await request('/events');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
  });

  test('GET /api/events/:id should return 404 for nonexistent event', async () => {
    const res = await request('/events/999999');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test('POST /api/events should allow ORGANIZER to create event', async () => {
    const token = await login('organizer@hack.com');
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: 'Quantum Computing Hackathon 2026',
        description: 'Building algorithms on quantum simulators.',
        startDate: new Date().toISOString(),
        deadline: futureDate,
        minTeamSize: 1,
        maxTeamSize: 4,
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'Quantum Computing Hackathon 2026');
  });

  test('POST /api/events should REJECT PARTICIPANT with 403 Forbidden', async () => {
    const token = await login('alice@hack.com');
    const res = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: 'Hacker Created Event',
        description: 'This should not be allowed.',
        startDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 100000).toISOString(),
      },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  test('POST /api/events should REJECT JUDGE with 403 Forbidden', async () => {
    const token = await login('judge1@hack.com');
    const res = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: 'Judge Created Event',
        description: 'Judges cannot create events.',
        startDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 100000).toISOString(),
      },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  test('POST /api/events/:id/publish-leaderboard should forbid participants', async () => {
    const token = await login('alice@hack.com');
    const res = await request('/events/1/publish-leaderboard', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { isLeaderboardPublished: true },
    });

    assert.equal(res.status, 403);
  });
});
