const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, login } = require('../testHelper');

describe('Authentication & Authorization Suite', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  test('POST /api/auth/register should register a new participant successfully', async () => {
    const randomEmail = `test_${Date.now()}@example.com`;
    const res = await request('/auth/register', {
      method: 'POST',
      body: {
        email: randomEmail,
        password: 'securepassword123',
        name: 'Test New User',
        role: 'PARTICIPANT',
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, randomEmail);
    assert.ok(res.body.data.token);
  });

  test('POST /api/auth/register should reject duplicate email with 409 Conflict', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: {
        email: 'organizer@hack.com',
        password: 'password123',
        name: 'Duplicate Organizer',
      },
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  test('POST /api/auth/register should reject short passwords with 400 Bad Request', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: {
        email: `short_${Date.now()}@example.com`,
        password: '123',
        name: 'Short Password User',
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.password);
  });

  test('POST /api/auth/login should authenticate valid credentials', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'organizer@hack.com',
        password: 'password123',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, 'ORGANIZER');
    assert.ok(res.body.data.token);
  });

  test('POST /api/auth/login should reject invalid credentials with 401 Unauthorized', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'organizer@hack.com',
        password: 'wrongpassword',
      },
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('GET /api/auth/me should reject unauthenticated requests with 401', async () => {
    const res = await request('/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('GET /api/auth/me should reject invalid Bearer tokens with 401', async () => {
    const res = await request('/auth/me', {
      headers: { Authorization: 'Bearer fake-invalid-token-xyz' },
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('GET /api/auth/me should return user profile for authenticated requests', async () => {
    const token = await login('alice@hack.com');
    const res = await request('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.email, 'alice@hack.com');
  });
});
