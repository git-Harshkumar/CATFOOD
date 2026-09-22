const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');

describe('T2 — Role & Track Isolation Security Test Suite', () => {
  let organizerToken;
  let judge1Token;
  let judge2Token;
  let participantToken;
  let eventId;
  let trackAId;
  let trackBId;
  let criterionId;
  let subTrackAId;
  let subTrackBId;
  let unassignedSubId;
  let judge1Id;
  let judge2Id;

  before(async () => {
    await startTestServer();
    organizerToken = await login('organizer@hack.com');
    judge1Token = await login('judge1@hack.com');
    judge2Token = await login('judge2@hack.com');

    const ts = Date.now();
    const partRes = await request('/auth/register', {
      method: 'POST',
      body: { email: `isolation_part_${ts}@hack.com`, password: 'password123', name: 'Participant P' },
    });
    participantToken = partRes.body.data.token;

    // 1. Organizer creates event
    const eventRes = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        title: `Security & Isolation Event ${ts}`,
        description: 'Testing strict role and track isolation.',
        startDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 86400000).toISOString(),
        criteria: [
          { name: 'Architecture', maxScore: 10, weight: 1.0 },
        ],
      },
    });
    eventId = eventRes.body.data.id;
    criterionId = eventRes.body.data.criteria[0].id;

    // Create two tracks in database using Prisma via API
    const prisma = require('../../backend/src/utils/prisma');
    const trackA = await prisma.track.create({
      data: { eventId, name: 'Track A - Artificial Intelligence' },
    });
    const trackB = await prisma.track.create({
      data: { eventId, name: 'Track B - Web3 Security' },
    });
    trackAId = trackA.id;
    trackBId = trackB.id;

    // 2. Organizer invites Judge 1 with Track A ONLY
    const j1Res = await request(`/events/${eventId}/judges`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { judgeEmail: 'judge1@hack.com', trackIds: [trackAId] },
    });
    judge1Id = j1Res.body.data.id;

    // Organizer invites Judge 2 with Track B ONLY
    const j2Res = await request(`/events/${eventId}/judges`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { judgeEmail: 'judge2@hack.com', trackIds: [trackBId] },
    });
    judge2Id = j2Res.body.data.id;

    // 3. Create teams and submissions
    const teamARes = await request('/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${participantToken}` },
      body: { eventId, name: `Team Alpha ${ts}` },
    });
    const teamAId = teamARes.body.data.id;

    const subARes = await request(`/submissions/team/${teamAId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participantToken}` },
      body: {
        title: 'Project Alpha (Track A)',
        description: 'AI Project for Track A',
        trackId: trackAId,
      },
    });
    subTrackAId = subARes.body.data.id;

    // Create Team B & submission in Track B
    const part2Res = await request('/auth/register', {
      method: 'POST',
      body: { email: `part2_${ts}@hack.com`, password: 'password123', name: 'Participant 2' },
    });
    const part2Token = part2Res.body.data.token;

    const teamBRes = await request('/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${part2Token}` },
      body: { eventId, name: `Team Beta ${ts}` },
    });
    const teamBId = teamBRes.body.data.id;

    const subBRes = await request(`/submissions/team/${teamBId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${part2Token}` },
      body: {
        title: 'Project Beta (Track B)',
        description: 'Web3 Security Project for Track B',
        trackId: trackBId,
      },
    });
    subTrackBId = subBRes.body.data.id;

    // Create Unassigned Submission in Track A
    const part3Res = await request('/auth/register', {
      method: 'POST',
      body: { email: `part3_${ts}@hack.com`, password: 'password123', name: 'Participant 3' },
    });
    const teamCRes = await request('/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${part3Res.body.data.token}` },
      body: { eventId, name: `Team Gamma ${ts}` },
    });
    const subCRes = await request(`/submissions/team/${teamCRes.body.data.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${part3Res.body.data.token}` },
      body: {
        title: 'Project Gamma (Unassigned to Judge 1)',
        description: 'AI Project not assigned to judge 1',
        trackId: trackAId,
      },
    });
    unassignedSubId = subCRes.body.data.id;

    // Assign Judge 1 explicitly to subTrackAId only
    await request(`/events/${eventId}/assignments/batch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        judgeIds: [judge1Id],
        submissionIds: [subTrackAId],
        batchName: 'security_batch_1',
      },
    });

    // Assign Judge 2 explicitly to subTrackBId only
    await request(`/events/${eventId}/assignments/batch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        judgeIds: [judge2Id],
        submissionIds: [subTrackBId],
        batchName: 'security_batch_2',
      },
    });
  });

  after(async () => {
    await stopTestServer();
  });

  test('Security 1: Unauthenticated request to /api/judge/scores -> 401 Unauthorized', async () => {
    const res = await request('/judge/scores');
    assert.equal(res.status, 401);
  });

  test('Security 2: Authenticated Judge 1 reads own scores -> 200 OK', async () => {
    const res = await request('/judge/scores', {
      headers: { Authorization: `Bearer ${judge1Token}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  test('Security 3: Authenticated Participant attempting to access judge scores -> 403 Forbidden', async () => {
    const res = await request('/judge/scores', {
      headers: { Authorization: `Bearer ${participantToken}` },
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Forbidden|authorized/i);
  });

  test('Security 4: Judge 1 scores their assigned Track A project -> 200 OK', async () => {
    const res = await request(`/judging/score/${subTrackAId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${judge1Token}` },
      body: {
        scores: [{ criterionId, score: 9, feedback: 'Superb architecture!' }],
      },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('Security 5: TRACK ISOLATION — Judge 1 (Track A) attempts to score Track B project -> 403 Forbidden', async () => {
    const res = await request(`/judging/score/${subTrackBId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${judge1Token}` },
      body: {
        scores: [{ criterionId, score: 8, feedback: 'Attempting cross-track score' }],
      },
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /track/i);
  });

  test('Security 6: ASSIGNMENT ISOLATION — Judge 1 attempts to score unassigned project in same track -> 403 Forbidden', async () => {
    const res = await request(`/judging/score/${unassignedSubId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${judge1Token}` },
      body: {
        scores: [{ criterionId, score: 7 }],
      },
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /assigned/i);
  });

  test('Security 7: PEER ISOLATION / IDOR — Judge 2 attempts to read Judge 1 scores via ?judge=judge1@hack.com -> 403 Forbidden', async () => {
    const res = await request('/judge/scores?judge=judge1@hack.com', {
      headers: { Authorization: `Bearer ${judge2Token}` },
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Forbidden|permission/i);
  });

  test('Security 8: PEER ISOLATION / IDOR — Judge 2 attempts to read Judge 1 scores via ?judgeId=... -> 403 Forbidden', async () => {
    const res = await request(`/judge/scores?judgeId=${judge1Id}`, {
      headers: { Authorization: `Bearer ${judge2Token}` },
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Forbidden|permission/i);
  });

  test('Security 9: Judge 2 reads their own scores specifying their own email -> 200 OK', async () => {
    const res = await request('/judge/scores?judge=judge2@hack.com', {
      headers: { Authorization: `Bearer ${judge2Token}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('Security 10: Judge Queue returns only assigned projects and respects Track isolation', async () => {
    const res = await request(`/judging/${eventId}/queue`, {
      headers: { Authorization: `Bearer ${judge1Token}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    const queue = res.body.data[0].submissions;

    // Judge 1 should see only Project Alpha (not Project Beta which is Track B, nor unassigned Project Gamma)
    assert.equal(queue.length, 1);
    assert.equal(queue[0].submissionId, subTrackAId);
  });
});
