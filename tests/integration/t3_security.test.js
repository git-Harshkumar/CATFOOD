const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');

describe('T3 Community Voting, Gallery & Anti-Abuse Comprehensive Security Suite', () => {
  let organizerToken;
  let organizer2Token;
  let participant1Token;
  let participant2Token;
  let participant3Token;
  let adminToken;
  let eventAId;
  let eventBId;
  let teamAId;
  let teamBId;
  let submissionAId;
  let submissionBId;

  before(async () => {
    await startTestServer();
    organizerToken = await login('organizer@hack.com');
    adminToken = await login('admin@hack.com');

    // Register test participants
    const ts = Date.now();
    const p1 = await request('/auth/register', {
      method: 'POST',
      body: { email: `t3_p1_${ts}@test.org`, password: 'password123', name: 'Participant 1' },
    });
    participant1Token = p1.body.data.token;

    const p2 = await request('/auth/register', {
      method: 'POST',
      body: { email: `t3_p2_${ts}@test.org`, password: 'password123', name: 'Participant 2' },
    });
    participant2Token = p2.body.data.token;

    const p3 = await request('/auth/register', {
      method: 'POST',
      body: { email: `t3_p3_${ts}@test.org`, password: 'password123', name: 'Participant 3' },
    });
    participant3Token = p3.body.data.token;

    // Register second organizer for multi-tenancy testing
    const org2 = await request('/auth/register', {
      method: 'POST',
      body: { email: `t3_org2_${ts}@test.org`, password: 'password123', name: 'Organizer Event B', role: 'ORGANIZER' },
    });
    organizer2Token = org2.body.data.token;

    // Create Event A (managed by Organizer 1)
    const evARes = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: {
        title: `T3 Security Event A ${ts}`,
        description: 'Testing community voting integrity',
        startDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    assert.equal(evARes.status, 201);
    eventAId = evARes.body.data.id;

    // Create Event B (managed by Organizer 2)
    const evBRes = await request('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizer2Token}` },
      body: {
        title: `T3 Security Event B ${ts}`,
        description: 'Multi-tenant isolation event',
        startDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    assert.equal(evBRes.status, 201);
    eventBId = evBRes.body.data.id;

    // Create Team A in Event A with Participant 1 as leader
    const teamARes = await request('/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${participant1Token}` },
      body: { name: `Team A Alpha ${ts}`, eventId: eventAId },
    });
    assert.equal(teamARes.status, 201);
    teamAId = teamARes.body.data.id;

    // Create Team B in Event B with Participant 2 as leader
    const teamBRes = await request('/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${participant2Token}` },
      body: { name: `Team B Beta ${ts}`, eventId: eventBId },
    });
    assert.equal(teamBRes.status, 201);
    teamBId = teamBRes.body.data.id;

    // Participant 1 submits Project A for Team A
    const subARes = await request(`/submissions/team/${teamAId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participant1Token}` },
      body: {
        title: 'Project A Glass Signal',
        tagline: 'Secure submission A',
        description: 'Project A architecture description',
        repoUrl: 'https://github.com/example/project-a',
        demoUrl: 'https://project-a.example.org',
        status: 'SUBMITTED',
      },
    });
    assert.equal(subARes.status, 200);
    submissionAId = subARes.body.data.id;

    // Participant 2 submits Project B for Team B with XSS payloads
    const subBRes = await request(`/submissions/team/${teamBId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participant2Token}` },
      body: {
        title: 'Project B <script>alert("xss-title")</script>',
        tagline: 'XSS <img src=x onerror=alert("xss-img")>',
        description: 'Project B with dangerous URLs',
        repoUrl: 'javascript:alert("xss-repo")',
        demoUrl: 'https://project-b.example.org',
        status: 'SUBMITTED',
      },
    });
    assert.equal(subBRes.status, 200);
    submissionBId = subBRes.body.data.id;
  });

  after(async () => {
    await stopTestServer();
  });

  // --- 1. CREDIT VALIDATION & QUADRATIC BUDGET ---

  test('Credits: Rejects negative credits (-5)', async () => {
    const res = await request('/community/vote', {
      method: 'POST',
      headers: { Authorization: `Bearer ${participant2Token}` },
      body: { project_id: submissionAId, credits: -5 },
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /positive integer/i);
  });

  test('Credits: Rejects zero credits (0)', async () => {
    const res = await request('/community/vote', {
      method: 'POST',
      headers: { Authorization: `Bearer ${participant2Token}` },
      body: { project_id: submissionAId, credits: 0 },
    });
    assert.equal(res.status, 400);
  });

  test('Credits: Rejects decimal credits (2.5)', async () => {
    const res = await request('/community/vote', {
      method: 'POST',
      headers: { Authorization: `Bearer ${participant2Token}` },
      body: { project_id: submissionAId, credits: 2.5 },
    });
    assert.equal(res.status, 400);
  });

  test('Credits: Rejects excessively large credits (100,000,000)', async () => {
    const res = await request('/community/vote', {
      method: 'POST',
      headers: { Authorization: `Bearer ${participant2Token}` },
      body: { project_id: submissionAId, credits: 100000000 },
    });
    assert.equal(res.status, 400);
  });

  test('Credits: Rejects NaN and non-numeric credits ("abc")', async () => {
    const res = await request('/community/vote', {
      method: 'POST',
      headers: { Authorization: `Bearer ${participant2Token}` },
      body: { project_id: submissionAId, credits: 'abc' },
    });
    assert.equal(res.status, 400);
  });

  test('Credits: Rejects budget exhaustion (exceeding remaining balance)', async () => {
    // Budget is 100. Requesting 150 must fail.
    const res = await request('/community/vote', {
      method: 'POST',
      headers: { Authorization: `Bearer ${participant2Token}` },
      body: { project_id: submissionAId, credits: 150 },
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /exceed|budget|credits/i);
  });

  // --- 2. SELF-VOTING PREVENTION ---

  test('Self-Voting: Participant cannot vote for their own team submission (403 Forbidden)', async () => {
    const res = await request('/community/vote', {
      method: 'POST',
      headers: { Authorization: `Bearer ${participant1Token}` },
      body: { project_id: submissionAId, credits: 5 },
    });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /prohibited|own/i);
  });

  // --- 3. ATOMIC CONCURRENCY & DUPLICATE VOTE PROTECTION ---

  test('Concurrency: 20 concurrent duplicate votes yield exactly 1 success and 19 rejected (409/429)', async () => {
    // Participant 2 votes for Submission A 20 times concurrently
    const promises = Array.from({ length: 20 }, () =>
      request('/community/vote', {
        method: 'POST',
        headers: { Authorization: `Bearer ${participant2Token}` },
        body: { project_id: submissionAId, credits: 9 },
      })
    );

    const responses = await Promise.all(promises);
    const successCount = responses.filter((r) => r.status === 201).length;
    const rejectedCount = responses.filter((r) => r.status === 409 || r.status === 429).length;

    assert.equal(successCount, 1, `Expected exactly 1 vote to succeed, got ${successCount}`);
    assert.equal(rejectedCount, 19, `Expected 19 duplicate/burst attempts to be rejected, got ${rejectedCount}`);
  });

  // --- 4. VOTING IDENTITY MODES ---

  test('Voting Mode: Unauthenticated user rejected in AUTHENTICATED mode (401)', async () => {
    // Ensure Event A is in AUTHENTICATED mode
    await request(`/community/${eventAId}/settings`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { communityVotingMode: 'AUTHENTICATED' },
    });

    const res = await request('/community/vote', {
      method: 'POST',
      body: { project_id: submissionAId, credits: 1 },
    });
    assert.equal(res.status, 401);
  });

  test('Voting Mode: Organizer switches Event A to OPEN mode', async () => {
    const res = await request(`/community/${eventAId}/settings`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { communityVotingMode: 'OPEN' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.communityVotingMode, 'OPEN');
  });

  test('Voting Mode: OPEN mode assigns unique voter token and records vote', async () => {
    const res = await request('/community/vote', {
      method: 'POST',
      body: { project_id: submissionAId, credits: 4 },
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.data.voterToken, 'Server must return a secure voterToken in OPEN mode');

    // Duplicate attempt with the same voterToken must be rejected
    const dupRes = await request('/community/vote', {
      method: 'POST',
      headers: { 'x-voter-token': res.body.data.voterToken },
      body: { project_id: submissionAId, credits: 4 },
    });
    assert.equal(dupRes.status, 409);
  });

  test('Voting Mode: EMAIL mode requires verified challenge code', async () => {
    // Switch to EMAIL mode
    await request(`/community/${eventAId}/settings`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { communityVotingMode: 'EMAIL' },
    });

    const testEmail = `voter_${Date.now()}@example.com`;

    // Attempt vote without verification -> 400
    const unverifiedRes = await request('/community/vote', {
      method: 'POST',
      body: { project_id: submissionAId, voterEmail: testEmail, credits: 1 },
    });
    assert.equal(unverifiedRes.status, 400);
    assert.match(unverifiedRes.body.message, /verify your email/i);

    // Request verification token
    const reqRes = await request('/community/verify-email/request', {
      method: 'POST',
      body: { eventId: eventAId, email: testEmail },
    });
    assert.equal(reqRes.status, 200);
    const token = reqRes.body.data.token;
    assert.ok(token);

    // Confirm verification
    const confRes = await request('/community/verify-email/confirm', {
      method: 'POST',
      body: { eventId: eventAId, email: testEmail, token },
    });
    assert.equal(confRes.status, 200);

    // Now vote with verified email -> succeeds
    const verifiedVoteRes = await request('/community/vote', {
      method: 'POST',
      body: { project_id: submissionAId, voterEmail: testEmail, credits: 4 },
    });
    assert.equal(verifiedVoteRes.status, 201);
  });

  // --- 5. RESULTS SEALING & CONFIDENTIALITY ---

  test('Results Confidentiality: Participants blocked from sealed results (403)', async () => {
    const res = await request(`/community/${eventAId}/results`, {
      headers: { Authorization: `Bearer ${participant2Token}` },
    });
    assert.equal(res.status, 403);
  });

  test('Results Confidentiality: Organizer can view results while sealed (200)', async () => {
    const res = await request(`/community/${eventAId}/results`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.standings));
  });

  test('Results Confidentiality: Pairwise standings sealed from non-organizers (403)', async () => {
    const res = await request(`/judging/${eventAId}/pairwise/standings`, {
      headers: { Authorization: `Bearer ${participant2Token}` },
    });
    assert.equal(res.status, 403);
  });

  // --- 6. MULTI-TENANCY & CROSS-EVENT ISOLATION ---

  test('Multi-Tenancy: Organizer A CANNOT access Event B audit logs (403)', async () => {
    const res = await request(`/events/${eventBId}/audit-logs`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    assert.equal(res.status, 403);
  });

  test('Multi-Tenancy: Organizer A CANNOT modify Event B voting settings (403)', async () => {
    const res = await request(`/community/${eventBId}/settings`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${organizerToken}` },
      body: { isCommunityVotingOpen: false },
    });
    assert.equal(res.status, 403);
  });

  test('Multi-Tenancy: Organizer B CAN access Event B audit logs (200)', async () => {
    const res = await request(`/events/${eventBId}/audit-logs`, {
      headers: { Authorization: `Bearer ${organizer2Token}` },
    });
    assert.equal(res.status, 200);
  });

  // --- 7. COMMENTS AUTHENTICATION & MODERATION ---

  let commentId;

  test('Comments: Unauthenticated comment rejected (401)', async () => {
    const res = await request(`/community/comments/${submissionAId}`, {
      method: 'POST',
      body: { content: 'Unauthenticated spoofing attempt' },
    });
    assert.equal(res.status, 401);
  });

  test('Comments: Authenticated user posts comment with verified authorId', async () => {
    const res = await request(`/community/comments/${submissionAId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participant2Token}` },
      body: { content: 'Great architecture design on Project A!' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.content, 'Great architecture design on Project A!');
    assert.equal(res.body.data.authorName, 'Participant 2');
    commentId = res.body.data.id;
  });

  test('Comments: Unauthorized user cannot delete comment (403)', async () => {
    // Participant 3 (unrelated user, not author, not team leader, not organizer) tries to delete Participant 2's comment -> 403
    const res = await request(`/community/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${participant3Token}` },
    });
    assert.equal(res.status, 403);
  });

  test('Comments: Comment author can delete own comment (soft delete)', async () => {
    const res = await request(`/community/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${participant2Token}` },
    });
    assert.equal(res.status, 200);

    // Read back comments: deleted comment should be omitted from active list
    const listRes = await request(`/community/comments/${submissionAId}`);
    assert.equal(listRes.status, 200);
    const deleted = listRes.body.data.find((c) => c.id === commentId);
    assert.equal(deleted, undefined, 'Soft-deleted comment must not be in active comments');
  });

  // --- 8. STORED XSS NEUTRALIZATION IN EMBED GALLERY ---

  test('Embed Gallery: Stored XSS payloads are properly escaped and dangerous protocols neutralized', async () => {
    const res = await request(`/embed/gallery/${eventBId}`);
    assert.equal(res.status, 200);
    const html = res.text;

    // Script tag in title must be escaped
    assert.ok(!html.includes('<script>alert("xss-title")</script>'), 'Unescaped script tag found in HTML');
    assert.ok(html.includes('&lt;script&gt;alert(&quot;xss-title&quot;)&lt;/script&gt;') || html.includes('&lt;script&gt;'), 'Script tag was not properly HTML-escaped');

    // Img onerror tag in tagline must be escaped
    assert.ok(!html.includes('<img src=x onerror=alert("xss-img")>'), 'Unescaped img tag found in HTML');
    assert.ok(html.includes('&lt;img src=x onerror=alert(&quot;xss-img&quot;)&gt;') || html.includes('&lt;img'), 'Img tag was not properly HTML-escaped');

    // Dangerous javascript: URL protocol must be neutralized
    assert.ok(!html.includes('href="javascript:'), 'Dangerous javascript: URL found in HTML');
  });

  // --- 9. AUDIT LOGGING OF REJECTED ATTEMPTS ---

  test('Audit Trail: Duplicate vote attempt is logged in audit trail', async () => {
    const res = await request(`/events/${eventAId}/audit-logs`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    assert.equal(res.status, 200);
    const logs = Array.isArray(res.body.data) ? res.body.data : res.body;
    const dupLog = logs.find((l) => l.action === 'COMMUNITY_VOTE_DUPLICATE_REJECTED');
    assert.ok(dupLog, 'COMMUNITY_VOTE_DUPLICATE_REJECTED entry must be present in audit logs');
  });
});
