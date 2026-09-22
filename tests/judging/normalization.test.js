const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');
const judgingEngine = require('../../backend/src/services/judgingEngine');

describe('T2 — Cross-Judge Normalization Engine Test Suite', () => {
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
      body: { email: `norm_part_${ts}@hack.com`, password: 'password123', name: 'Norm Participant' },
    });
    participantToken = partRes.body.data.token;

    // Create event
    const eventRes = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        title: `Normalization Hackathon ${ts}`,
        description: 'Testing cross-judge normalization and edge cases.',
        startDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 86400000).toISOString(),
        criteria: [{ name: 'Overall Quality', maxScore: 10, weight: 1.0 }],
      },
    });
    eventId = eventRes.body.data.id;
  });

  after(async () => {
    await stopTestServer();
  });

  test('Normalization Engine: Generous Judge vs Strict Judge adjustment', () => {
    // Judge 1 (Strict): scores range from 2 to 6 (mean = 4.0)
    // Judge 2 (Generous): scores range from 7 to 10 (mean = 8.5)
    // Both judges score 3 projects:
    const evaluations = [
      // Strict judge
      { judgeId: 1, submissionId: 101, rawScore: 6, maxPossible: 10 }, // Best for strict judge (+1.0 sigma)
      { judgeId: 1, submissionId: 102, rawScore: 4, maxPossible: 10 }, // Average for strict judge (0 sigma)
      { judgeId: 1, submissionId: 103, rawScore: 2, maxPossible: 10 }, // Worst for strict judge (-1.0 sigma)

      // Generous judge
      { judgeId: 2, submissionId: 101, rawScore: 10, maxPossible: 10 }, // Best for generous judge
      { judgeId: 2, submissionId: 102, rawScore: 8.5, maxPossible: 10 }, // Average for generous judge
      { judgeId: 2, submissionId: 103, rawScore: 7, maxPossible: 10 }, // Worst for generous judge
    ];

    const result = judgingEngine.normalizeScores(evaluations, { targetScaleMax: 10 });
    const { normalizedScores, judgeStats, globalStats } = result;

    assert.ok(globalStats.mean > 0);
    assert.equal(judgeStats[1].mean, 4);
    assert.equal(judgeStats[2].mean, 8.5);

    // Submission 101 was the best for both judges; its normalized score should reflect high ranking
    const sub101Judge1 = normalizedScores.find((s) => s.judgeId === 1 && s.submissionId === 101);
    const sub103Judge2 = normalizedScores.find((s) => s.judgeId === 2 && s.submissionId === 103);

    // Strict judge's 6 was their top score (z > 0), whereas generous judge's 7 was their lowest score (z < 0)
    assert.ok(sub101Judge1.zScore > 0, 'Top score from strict judge must have positive z-score');
    assert.ok(sub103Judge2.zScore < 0, 'Lowest score from generous judge must have negative z-score');
    assert.ok(sub101Judge1.normalizedScore > sub103Judge2.normalizedScore, 'Top score from strict judge normalized higher than lowest score from generous judge');
  });

  test('Edge Case 1: Standard Deviation = 0 (Judge gives identical scores to all projects)', () => {
    // Judge 3 gives all 4 projects identical score of 8.0
    const evaluations = [
      { judgeId: 3, submissionId: 201, rawScore: 8, maxPossible: 10 },
      { judgeId: 3, submissionId: 202, rawScore: 8, maxPossible: 10 },
      { judgeId: 3, submissionId: 203, rawScore: 8, maxPossible: 10 },
      { judgeId: 3, submissionId: 204, rawScore: 8, maxPossible: 10 },
    ];

    const result = judgingEngine.normalizeScores(evaluations, { targetScaleMax: 10 });
    assert.ok(result);
    assert.equal(result.judgeStats[3].stdDev, 0);

    // Must not produce NaN, null, or Infinity
    for (const ns of result.normalizedScores) {
      assert.ok(!isNaN(ns.normalizedScore), 'Normalized score must not be NaN');
      assert.ok(isFinite(ns.normalizedScore), 'Normalized score must be finite');
      assert.equal(ns.zScore, 0, 'Z-score for zero-variance judge should be 0');
      assert.equal(ns.metadata.fallbackReason, 'ZERO_VARIANCE_FALLBACK');
    }
  });

  test('Edge Case 2: Single available score (N = 1)', () => {
    // Judge 4 evaluated only 1 project
    const evaluations = [
      { judgeId: 4, submissionId: 301, rawScore: 9, maxPossible: 10 },
    ];

    const result = judgingEngine.normalizeScores(evaluations, { targetScaleMax: 10 });
    assert.ok(result);
    assert.equal(result.normalizedScores.length, 1);

    const singleScore = result.normalizedScores[0];
    assert.ok(!isNaN(singleScore.normalizedScore));
    assert.ok(isFinite(singleScore.normalizedScore));
    assert.equal(singleScore.metadata.fallbackReason, 'SINGLE_SCORE_FALLBACK');
    assert.equal(singleScore.normalizedScore, 9);
  });

  test('Edge Case 3: Incomplete review batches / differing review counts per project', () => {
    // Project A has 3 reviews, Project B has 1 review, Project C has 2 reviews
    const evaluations = [
      { judgeId: 1, submissionId: 1, rawScore: 8, maxPossible: 10 },
      { judgeId: 2, submissionId: 1, rawScore: 7, maxPossible: 10 },
      { judgeId: 3, submissionId: 1, rawScore: 9, maxPossible: 10 },

      { judgeId: 1, submissionId: 2, rawScore: 6, maxPossible: 10 },

      { judgeId: 2, submissionId: 3, rawScore: 8, maxPossible: 10 },
      { judgeId: 3, submissionId: 3, rawScore: 7, maxPossible: 10 },
    ];

    const normResult = judgingEngine.normalizeScores(evaluations);
    assert.equal(normResult.normalizedScores.length, 6);

    const mockSubmissions = [
      { id: 1, title: 'Project A', normalizedScores: normResult.normalizedScores.filter(n => n.submissionId === 1) },
      { id: 2, title: 'Project B', normalizedScores: normResult.normalizedScores.filter(n => n.submissionId === 2) },
      { id: 3, title: 'Project C', normalizedScores: normResult.normalizedScores.filter(n => n.submissionId === 3) },
    ];

    const standings = judgingEngine.aggregateFinalStandings(mockSubmissions, []);
    assert.equal(standings.length, 3);
    assert.equal(standings.find(s => s.submissionId === 1).reviewCount, 3);
    assert.equal(standings.find(s => s.submissionId === 2).reviewCount, 1);
    assert.equal(standings.find(s => s.submissionId === 3).reviewCount, 2);
  });

  test('Authorization: Non-organizer cannot run normalization endpoint -> 403 Forbidden', async () => {
    const res = await request(`/events/${eventId}/judging/normalize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participantToken}` },
    });

    assert.equal(res.status, 403);
  });

  test('Authorization: Organizer can run normalization endpoint -> 200 OK', async () => {
    const res = await request(`/events/${eventId}/judging/normalize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.standings);
  });
});
