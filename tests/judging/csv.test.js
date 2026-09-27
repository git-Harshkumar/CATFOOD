const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');

describe('T2 — CSV Export Security & Content Test Suite', () => {
  let organizerToken;
  let judgeToken;
  let participantToken;
  let eventId;

  before(async () => {
    await startTestServer();
    organizerToken = await login('organizer@hack.com');
    judgeToken = await login('judge1@hack.com');

    const ts = Date.now();
    const partRes = await request('/auth/register', {
      method: 'POST',
      body: { email: `csv_part_${ts}@hack.com`, password: 'password123', name: 'CSV Participant' },
    });
    participantToken = partRes.body.data.token;

    // Create event
    const eventRes = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        title: `CSV Export Hackathon ${ts}`,
        description: 'Testing organizer-only CSV exports.',
        startDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 86400000).toISOString(),
        criteria: [{ name: 'Architecture', maxScore: 10, weight: 1.0 }],
      },
    });
    eventId = eventRes.body.data.id;
    const criterionId = eventRes.body.data.criteria[0].id;

    // Assign judge
    await request(`/events/${eventId}/judges`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { judgeEmail: 'judge1@hack.com' },
    });

    // Create team and submission
    const teamRes = await request('/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${participantToken}` },
      body: { eventId, name: `CSV Team ${ts}` },
    });
    const subRes = await request(`/submissions/team/${teamRes.body.data.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participantToken}` },
      body: {
        title: 'Project Comma, "Quotes", and Newlines\nDeliverable',
        description: 'Tests RFC-4180 escaping.',
      },
    });
    const subId = subRes.body.data.id;

    // Submit a score
    await request(`/judging/score/${subId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${judgeToken}` },
      body: {
        scores: [{ criterionId, score: 9, feedback: 'Excellent "quoted" text, with comma.' }],
      },
    });
  });

  after(async () => {
    await stopTestServer();
  });

  test('Export 1: Unauthenticated request to CSV export -> 401 Unauthorized', async () => {
    const res = await request(`/organizer/judging/export.csv?eventId=${eventId}`);
    assert.equal(res.status, 401);
  });

  test('Export 2: Participant attempting to export judging CSV -> 403 Forbidden', async () => {
    const res = await request(`/organizer/judging/export.csv?eventId=${eventId}`, {
      headers: { Authorization: `Bearer ${participantToken}` },
    });
    assert.equal(res.status, 403);
  });

  test('Export 3: Judge attempting to export organizer judging CSV -> 403 Forbidden', async () => {
    const res = await request(`/organizer/judging/export.csv?eventId=${eventId}`, {
      headers: { Authorization: `Bearer ${judgeToken}` },
    });
    assert.equal(res.status, 403);
  });

  test('Export 4: Acceptance Checker Route (/api/organizer/judging/export.csv) -> 200 OK + text/csv body', async () => {
    const res = await request(`/organizer/judging/export.csv?eventId=${eventId}`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });

    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type');
    assert.match(contentType, /text\/csv/i);
    assert.ok(res.text && res.text.length > 0);

    // Verify CSV header line
    assert.match(res.text, /Rank,Submission ID,Project Title,Team Name/);
  });

  test('Export 5: Event Subroute (/api/events/:eventId/judging/export.csv) -> 200 OK', async () => {
    const res = await request(`/events/${eventId}/judging/export.csv`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/csv/i);
  });

  test('Export 6: Export type=scores contains detailed marks and RFC-4180 escaped feedback', async () => {
    const res = await request(`/events/${eventId}/judging/export.csv?type=scores`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/csv/i);
    assert.match(res.text, /Judge Name,Judge Email,Criterion,Raw Score/);

    // Escaped quotes test: 'Excellent "quoted" text, with comma.' -> '""quoted""'
    assert.match(res.text, /""quoted""/);
  });

  test('Export 7: Export type=progress contains judge completion percentages', async () => {
    const res = await request(`/events/${eventId}/judging/export.csv?type=progress`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });

    assert.equal(res.status, 200);
    assert.match(res.text, /Judge ID,Judge Name,Judge Email,Assigned Projects,Completed Reviews/);
  });

  test('Export 8: Export type=assignments contains batch and status information', async () => {
    const res = await request(`/events/${eventId}/judging/export.csv?type=assignments`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });

    assert.equal(res.status, 200);
    assert.match(res.text, /Assignment ID,Judge Name,Judge Email,Submission ID/);
  });
});
