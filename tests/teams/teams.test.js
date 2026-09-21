const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');

describe('Team Management & Isolation Suite', () => {
  let organizerToken;
  let user1Token;
  let user2Token;
  let user3Token;
  let testEventId;

  before(async () => {
    await startTestServer();
    organizerToken = await login('organizer@hack.com');

    // Register 3 fresh users for clean team isolation tests
    const ts = Date.now();
    const u1 = await request('/auth/register', {
      method: 'POST',
      body: { email: `tuser1_${ts}@hack.com`, password: 'password123', name: 'Team User 1' },
    });
    user1Token = u1.body.data.token;

    const u2 = await request('/auth/register', {
      method: 'POST',
      body: { email: `tuser2_${ts}@hack.com`, password: 'password123', name: 'Team User 2' },
    });
    user2Token = u2.body.data.token;

    const u3 = await request('/auth/register', {
      method: 'POST',
      body: { email: `tuser3_${ts}@hack.com`, password: 'password123', name: 'Team User 3' },
    });
    user3Token = u3.body.data.token;

    // Create a dedicated event with maxTeamSize = 2
    const ev = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        title: `Team Isolation Event ${ts}`,
        description: 'Testing team constraints and invite codes.',
        startDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 86400000).toISOString(),
        minTeamSize: 1,
        maxTeamSize: 2,
      },
    });
    testEventId = ev.body.data.id;
  });

  after(async () => {
    await stopTestServer();
  });

  let createdTeamInviteCode;
  let createdTeamId;

  test('POST /api/teams should create team and assign creator as leader', async () => {
    const res = await request('/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: {
        eventId: testEventId,
        name: 'Apex Innovators',
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Apex Innovators');
    assert.ok(res.body.data.inviteCode);
    assert.equal(res.body.data.members.length, 1);

    createdTeamInviteCode = res.body.data.inviteCode;
    createdTeamId = res.body.data.id;
  });

  test('POST /api/teams should reject duplicate team name in same event with 409', async () => {
    const res = await request('/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` },
      body: {
        eventId: testEventId,
        name: 'Apex Innovators',
      },
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  test('POST /api/teams should prevent user from creating a second team in same event', async () => {
    const res = await request('/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: {
        eventId: testEventId,
        name: 'Second Team Attempt',
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('POST /api/teams/join should allow member to join with valid inviteCode', async () => {
    const res = await request('/teams/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` },
      body: { inviteCode: createdTeamInviteCode },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.members.length, 2);
  });

  test('POST /api/teams/join should enforce maxTeamSize limit', async () => {
    // Event maxTeamSize was 2, now user3 tries to join
    const res = await request('/teams/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user3Token}` },
      body: { inviteCode: createdTeamInviteCode },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already full/i);
  });

  test('POST /api/teams/join should reject invalid invite code with 404', async () => {
    const res = await request('/teams/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user3Token}` },
      body: { inviteCode: 'TEAM-FAKE999' },
    });

    assert.equal(res.status, 404);
  });
});
