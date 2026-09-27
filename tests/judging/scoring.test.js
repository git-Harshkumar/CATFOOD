const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');
const judgingEngine = require('../../backend/src/services/judgingEngine');

describe('T2 — Rubric & Weighted Scoring Test Suite', () => {
  let organizerToken;
  let judgeToken;
  let eventId;
  let teamId;
  let submissionId;
  let crit1;
  let crit2;
  let crit3;

  before(async () => {
    await startTestServer();
    organizerToken = await login('organizer@hack.com');
    judgeToken = await login('judge1@hack.com');

    const ts = Date.now();
    // Organizer creates event with custom weighted rubric
    const eventRes = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        title: `Weighted Scoring Hackathon ${ts}`,
        description: 'Comprehensive scoring math test event.',
        startDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 86400000).toISOString(),
        criteria: [
          { name: 'Functionality', maxScore: 10, weight: 2.0 },
          { name: 'Innovation', maxScore: 5, weight: 1.5 },
          { name: 'UI / UX Design', maxScore: 10, weight: 0.5 },
        ],
      },
    });

    eventId = eventRes.body.data.id;
    crit1 = eventRes.body.data.criteria[0]; // Functionality: max 10, weight 2.0
    crit2 = eventRes.body.data.criteria[1]; // Innovation: max 5, weight 1.5
    crit3 = eventRes.body.data.criteria[2]; // UI/UX: max 10, weight 0.5

    // Assign judge to event
    await request(`/events/${eventId}/judges`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { judgeEmail: 'judge1@hack.com' },
    });

    // Create a participant and submission
    const partRes = await request('/auth/register', {
      method: 'POST',
      body: { email: `scorer_${ts}@hack.com`, password: 'password123', name: 'Scoring Contestant' },
    });
    const partToken = partRes.body.data.token;

    const teamRes = await request('/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${partToken}` },
      body: { eventId, name: `Scoring Team ${ts}` },
    });
    teamId = teamRes.body.data.id;

    const subRes = await request(`/submissions/team/${teamId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${partToken}` },
      body: {
        title: 'Project Calibrated Math',
        description: 'Verifying mathematical precision of weighted rubrics.',
      },
    });
    submissionId = subRes.body.data.id;
  });

  after(async () => {
    await stopTestServer();
  });

  test('Scoring Engine Unit Test: calculateWeightedScore mathematically correct', () => {
    const sampleCriteria = [
      { id: 1, name: 'Functionality', maxScore: 10, weight: 2.0 },
      { id: 2, name: 'Innovation', maxScore: 5, weight: 1.5 },
      { id: 3, name: 'UI/UX', maxScore: 10, weight: 0.5 },
    ];

    const sampleScores = [
      { criterionId: 1, score: 8 },  // 8 * 2.0 = 16.0
      { criterionId: 2, score: 4 },  // 4 * 1.5 = 6.0
      { criterionId: 3, score: 10 }, // 10 * 0.5 = 5.0
    ];

    // Total weighted: 16 + 6 + 5 = 27.0
    // Total max possible: (10*2) + (5*1.5) + (10*0.5) = 20 + 7.5 + 5 = 32.5
    // Percentage: (27 / 32.5) * 100 = 83.08%
    const result = judgingEngine.calculateWeightedScore(sampleScores, sampleCriteria);

    assert.equal(result.totalWeightedScore, 27);
    assert.equal(result.totalMaxPossible, 32.5);
    assert.equal(result.percentage, 83.08);
    assert.equal(result.scaledScore10, 8.31);
    assert.equal(result.breakdown.length, 3);
  });

  test('Scoring API Validation: Rejects negative score with 400 Bad Request', async () => {
    const res = await request(`/judging/score/${submissionId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${judgeToken}` },
      body: {
        scores: [
          { criterionId: crit1.id, score: -1 },
        ],
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    const errorMsg = JSON.stringify(res.body);
    assert.match(errorMsg, /non-negative|between/i);
  });

  test('Scoring API Validation: Rejects score > criterion.maxScore with 400 Bad Request', async () => {
    // crit2 has maxScore: 5. Giving 6 must be rejected.
    const res = await request(`/judging/score/${submissionId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${judgeToken}` },
      body: {
        scores: [
          { criterionId: crit2.id, score: 6 },
        ],
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /between 0 and 5/i);
  });

  test('Scoring API Validation: Rejects criterion from another event with 400', async () => {
    const res = await request(`/judging/score/${submissionId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${judgeToken}` },
      body: {
        scores: [
          { criterionId: 999999, score: 5 },
        ],
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /does not belong to this event/i);
  });

  test('Scoring Submission: Judge submits valid scores across all weighted criteria', async () => {
    const res = await request(`/judging/score/${submissionId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${judgeToken}` },
      body: {
        scores: [
          { criterionId: crit1.id, score: 8, feedback: 'Solid backend execution.' },
          { criterionId: crit2.id, score: 4, feedback: 'Creative approach.' },
          { criterionId: crit3.id, score: 9, feedback: 'Clean design language.' },
        ],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 3);
  });

  test('Organizer adds new criterion with validation', async () => {
    const res = await request(`/events/${eventId}/criteria`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        name: 'Documentation & Code Quality',
        description: 'Readability, tests, documentation.',
        maxScore: 10,
        weight: 1.0,
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.name, 'Documentation & Code Quality');
  });

  test('Rubric Validation: Rejects criterion with invalid negative weight', async () => {
    const res = await request(`/events/${eventId}/criteria`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        name: 'Faulty Weight Criterion',
        maxScore: 10,
        weight: -2.0,
      },
    });

    assert.equal(res.status, 400);
  });
});
