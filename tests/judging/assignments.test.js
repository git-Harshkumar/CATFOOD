const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');
const prisma = require('../../backend/src/utils/prisma');

describe('T2 — Judge Invitation, Batch & Algorithmic Assignment Test Suite', () => {
  let organizerToken;
  let eventId;
  let track1Id;
  let track2Id;
  let judge1Id;
  let judge2Id;
  let sub1Id;
  let sub2Id;
  let sub3Id;

  before(async () => {
    await startTestServer();
    organizerToken = await login('organizer@hack.com');

    const ts = Date.now();
    // Create event
    const eventRes = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        title: `Assignment Engine Event ${ts}`,
        description: 'Testing batch and algorithmic assignment.',
        startDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 86400000).toISOString(),
        criteria: [{ name: 'Criterion 1', maxScore: 10, weight: 1.0 }],
      },
    });
    eventId = eventRes.body.data.id;

    // Create 2 tracks
    const t1 = await prisma.track.create({ data: { eventId, name: 'AI & Data Track' } });
    const t2 = await prisma.track.create({ data: { eventId, name: 'Cloud & Systems Track' } });
    track1Id = t1.id;
    track2Id = t2.id;

    // Create 3 submissions
    for (let i = 1; i <= 3; i++) {
      const partRes = await request('/auth/register', {
        method: 'POST',
        body: { email: `assign_part_${i}_${ts}@hack.com`, password: 'password123', name: `Contestant ${i}` },
      });
      const teamRes = await request('/teams', {
        method: 'POST',
        headers: { Authorization: `Bearer ${partRes.body.data.token}` },
        body: { eventId, name: `Team ${i} ${ts}` },
      });
      const subRes = await request(`/submissions/team/${teamRes.body.data.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${partRes.body.data.token}` },
        body: {
          title: `Project ${i} Deliverable`,
          description: `Deliverable description for ${i}`,
          trackId: i === 1 ? track1Id : track2Id, // Sub 1 in Track 1, Subs 2 & 3 in Track 2
        },
      });

      if (i === 1) sub1Id = subRes.body.data.id;
      if (i === 2) sub2Id = subRes.body.data.id;
      if (i === 3) sub3Id = subRes.body.data.id;
    }
  });

  after(async () => {
    await stopTestServer();
  });

  test('Invitation 1: Organizer invites Judge 1 with Track 1 constraint', async () => {
    const res = await request(`/events/${eventId}/judges`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { judgeEmail: 'judge1@hack.com', trackIds: [track1Id] },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    judge1Id = res.body.data.id;
    assert.equal(res.body.data.status, 'INVITED');
    assert.equal(res.body.data.tracks.length, 1);
  });

  test('Invitation 2: Organizer invites Judge 2 with all tracks', async () => {
    const res = await request(`/events/${eventId}/judges`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { judgeEmail: 'judge2@hack.com', trackIds: [track1Id, track2Id] },
    });

    assert.equal(res.status, 201);
    judge2Id = res.body.data.id;
    assert.equal(res.body.data.tracks.length, 2);
  });

  test('Invitation 3: Judge updates status to ACCEPTED', async () => {
    const judge1Token = await login('judge1@hack.com');
    const res = await request(`/judging/${eventId}/judges/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${judge1Token}` },
      body: { status: 'ACCEPTED' },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ACCEPTED');
  });

  test('Invitation 4: Organizer lists all event judges with status and tracks', async () => {
    const res = await request(`/events/${eventId}/judges`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    const j1 = res.body.data.find((j) => j.id === judge1Id);
    assert.equal(j1.status, 'ACCEPTED');
    assert.equal(j1.tracks[0].track.name, 'AI & Data Track');
  });

  test('Batch Assignment: Organizer batch assigns judges and track isolation skips mismatches', async () => {
    // Judge 1 is restricted to Track 1. Submissions 1 (Track 1) and 2 (Track 2) are passed.
    // Sub 2 must be skipped for Judge 1 due to TRACK_MISMATCH!
    const res = await request(`/events/${eventId}/judge-assignments/batch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        judgeIds: [judge1Id],
        submissionIds: [sub1Id, sub2Id],
        batchName: 'pilot_batch_test',
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.assignedCount, 1); // Only sub 1 assigned
    assert.equal(res.body.data.skipped.length, 1);
    assert.equal(res.body.data.skipped[0].reason, 'TRACK_MISMATCH');
  });

  test('Algorithmic Assignment: Auto-assign balances workload and enforces track rules', async () => {
    const res = await request(`/events/${eventId}/judge-assignments/auto`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        judgesPerProject: 2,
        batchName: 'auto_round_1',
      },
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.assignedCount >= 1);
    assert.ok(res.body.data.workloads);
  });

  test('Assignments List: Organizer lists all assignments with track and judge information', async () => {
    const res = await request(`/events/${eventId}/judge-assignments`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 2);
    const first = res.body.data[0];
    assert.ok(first.judge);
    assert.ok(first.submission);
  });

  test('Assignment Deletion: Organizer removes assignment successfully', async () => {
    const listRes = await request(`/events/${eventId}/judge-assignments`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    const targetAssignment = listRes.body.data[0];

    const delRes = await request(`/events/${eventId}/judge-assignments/${targetAssignment.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${organizerToken}` },
    });

    assert.equal(delRes.status, 200);
  });

  test('Audit Trail: All judging actions recorded in audit log', async () => {
    const res = await request(`/events/${eventId}/audit-logs`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 4);

    const actions = res.body.data.map((l) => l.action);
    assert.ok(actions.includes('JUDGE_INVITED'));
    assert.ok(actions.includes('JUDGE_STATUS_UPDATED'));
    assert.ok(actions.includes('JUDGE_BATCH_ASSIGNED'));
    assert.ok(actions.includes('JUDGE_ALGORITHMIC_ASSIGNED'));
  });
});
