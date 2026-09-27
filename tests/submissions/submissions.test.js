const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');

describe('Submission Management & Deadline Enforcement Suite', () => {
  let organizerToken;
  let leaderToken;
  let outsiderToken;
  let teamId;
  let activeEventId;
  let expiredEventId;
  let expiredTeamId;

  before(async () => {
    await startTestServer();
    organizerToken = await login('organizer@hack.com');

    const ts = Date.now();
    // Leader of Team A
    const u1 = await request('/auth/register', {
      method: 'POST',
      body: { email: `sub_lead_${ts}@hack.com`, password: 'password123', name: 'Submission Leader' },
    });
    leaderToken = u1.body.data.token;

    // Outsider (Member of another team or no team)
    const u2 = await request('/auth/register', {
      method: 'POST',
      body: { email: `sub_out_${ts}@hack.com`, password: 'password123', name: 'Outsider User' },
    });
    outsiderToken = u2.body.data.token;

    // 1. Create Active Event (Deadline 2 days in future)
    const evActive = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        title: `Active Hackathon ${ts}`,
        description: 'Testing active submissions.',
        startDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
      },
    });
    activeEventId = evActive.body.data.id;

    // Create Team in Active Event
    const tm = await request('/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${leaderToken}` },
      body: { eventId: activeEventId, name: `Team Alpha ${ts}` },
    });
    teamId = tm.body.data.id;

    // 2. Create Expired Event (Deadline in past)
    const evExpired = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        title: `Expired Hackathon ${ts}`,
        description: 'Testing deadline enforcement.',
        startDate: new Date(Date.now() - 5 * 86400000).toISOString(),
        deadline: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      },
    });
    expiredEventId = evExpired.body.data.id;

    // Create Team in Expired Event (using organizer to bypass or registering separate user)
    const u3 = await request('/auth/register', {
      method: 'POST',
      body: { email: `expired_lead_${ts}@hack.com`, password: 'password123', name: 'Expired Leader' },
    });
    const expLeaderToken = u3.body.data.token;

    const expTeam = await request('/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${expLeaderToken}` },
      body: { eventId: expiredEventId, name: `Expired Team ${ts}` },
    });
    expiredTeamId = expTeam.body.data.id;
    expiredTeamLeaderToken = expLeaderToken;
  });

  let expiredTeamLeaderToken;

  after(async () => {
    await stopTestServer();
  });

  test('POST /api/submissions/team/:teamId should allow team leader to submit project before deadline', async () => {
    const res = await request(`/submissions/team/${teamId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${leaderToken}` },
      body: {
        title: 'Autonomous Drone Fleet',
        tagline: 'AI for search and rescue',
        description: 'Computer vision on edge devices detecting victims in disaster zones.',
        repoUrl: 'https://github.com/teamalpha/drone-fleet',
        demoUrl: 'https://drone-fleet.app',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'Autonomous Drone Fleet');
  });

  test('POST /api/submissions/team/:teamId should REJECT non-team member with 403 Forbidden', async () => {
    const res = await request(`/submissions/team/${teamId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${outsiderToken}` },
      body: {
        title: 'Malicious Overwrite',
        description: 'Trying to tamper with another team project.',
      },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /own team/i);
  });

  test('POST /api/submissions/team/:teamId should STRICTLY REJECT submissions past deadline with 403 Forbidden', async () => {
    const res = await request(`/submissions/team/${expiredTeamId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${expiredTeamLeaderToken}` },
      body: {
        title: 'Late Project Submission',
        description: 'Submitting after deadline has passed.',
      },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /deadline has passed/i);
  });

  test('POST /api/submissions/team/:teamId should reject invalid payload with missing title', async () => {
    const res = await request(`/submissions/team/${teamId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${leaderToken}` },
      body: {
        description: 'Missing title',
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });
});
