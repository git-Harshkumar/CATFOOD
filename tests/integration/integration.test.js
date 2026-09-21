const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');

describe('Full End-to-End Lifecycle & Judging Security Integration Suite', () => {
  let organizerToken;
  let judgeToken;
  let participantToken;
  let eventId;
  let criterion1Id;
  let criterion2Id;
  let teamId;
  let submissionId;

  before(async () => {
    await startTestServer();
    organizerToken = await login('organizer@hack.com');
    judgeToken = await login('judge1@hack.com');

    const ts = Date.now();
    const partRes = await request('/auth/register', {
      method: 'POST',
      body: { email: `e2e_user_${ts}@hack.com`, password: 'password123', name: 'E2E Hacker' },
    });
    participantToken = partRes.body.data.token;
  });

  after(async () => {
    await stopTestServer();
  });

  test('Step 1: Organizer creates hackathon with weighted rubrics', async () => {
    const res = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        title: `E2E Championship ${Date.now()}`,
        description: 'Complete lifecycle test hackathon.',
        startDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 86400000).toISOString(),
        criteria: [
          { name: 'Innovation', maxScore: 10, weight: 1.5 },
          { name: 'Architecture', maxScore: 10, weight: 1.0 },
        ],
      },
    });

    assert.equal(res.status, 201);
    eventId = res.body.data.id;
    criterion1Id = res.body.data.criteria[0].id;
    criterion2Id = res.body.data.criteria[1].id;
    assert.ok(eventId);
    assert.ok(criterion1Id);
  });

  test('Step 2: Organizer assigns Judge to event', async () => {
    const res = await request(`/events/${eventId}/judges`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { judgeEmail: 'judge1@hack.com' },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
  });

  test('Step 3: Participant creates team', async () => {
    const res = await request('/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${participantToken}` },
      body: {
        eventId,
        name: `CyberTeam ${Date.now()}`,
      },
    });

    assert.equal(res.status, 201);
    teamId = res.body.data.id;
  });

  test('Step 4: Participant submits project', async () => {
    const res = await request(`/submissions/team/${teamId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participantToken}` },
      body: {
        title: 'Project Nebula',
        description: 'Autonomous spatial computing mesh network.',
        repoUrl: 'https://github.com/nebula/mesh',
        demoUrl: 'https://nebula.mesh.io',
      },
    });

    assert.equal(res.status, 200);
    submissionId = res.body.data.id;
    assert.ok(submissionId);
  });

  test('Step 5: Participant attempts to submit scores -> REJECTED with 403', async () => {
    const res = await request(`/judging/score/${submissionId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participantToken}` },
      body: {
        scores: [
          { criterionId: criterion1Id, score: 10 },
        ],
      },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  test('Step 6: Judge attempts to submit score out of bounds (> maxScore) -> REJECTED with 400', async () => {
    const res = await request(`/judging/score/${submissionId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${judgeToken}` },
      body: {
        scores: [
          { criterionId: criterion1Id, score: 99 }, // Max is 10
        ],
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /must be between 0 and 10/i);
  });

  test('Step 7: Judge submits valid scores', async () => {
    const res = await request(`/judging/score/${submissionId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${judgeToken}` },
      body: {
        scores: [
          { criterionId: criterion1Id, score: 8, feedback: 'Great originality!' },
          { criterionId: criterion2Id, score: 9, feedback: 'Clean architecture.' },
        ],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 2);
  });

  test('Step 8: Participant views leaderboard BEFORE publishing -> 403 Forbidden', async () => {
    const res = await request(`/judging/leaderboard/${eventId}`, {
      headers: { Authorization: `Bearer ${participantToken}` },
    });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /not been published/i);
  });

  test('Step 9: Organizer publishes leaderboard', async () => {
    const res = await request(`/events/${eventId}/publish-leaderboard`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { isLeaderboardPublished: true },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.isLeaderboardPublished, true);
  });

  test('Step 10: Participant views leaderboard AFTER publishing -> 200 OK with correct math', async () => {
    const res = await request(`/judging/leaderboard/${eventId}`, {
      headers: { Authorization: `Bearer ${participantToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.rankings.length, 1);

    const ranking = res.body.data.rankings[0];
    assert.equal(ranking.title, 'Project Nebula');
    assert.equal(ranking.rank, 1);

    // Math check:
    // Criterion 1: score 8 * weight 1.5 = 12.0
    // Criterion 2: score 9 * weight 1.0 = 9.0
    // Total Weighted Score = 12 + 9 = 21.0
    // Max Possible = (10 * 1.5) + (10 * 1.0) = 25.0
    // Percentage = (21 / 25) * 100 = 84%
    assert.equal(ranking.totalWeightedScore, 21);
    assert.equal(ranking.totalMaxPossible, 25);
    assert.equal(ranking.percentage, 84);
  });
});
