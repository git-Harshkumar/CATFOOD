const app = require('../backend/src/server');

let server;
let baseUrl;

const startTestServer = async () => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve({ server, baseUrl });
    });
  });
};

const stopTestServer = async () => {
  return new Promise((resolve) => {
    if (server) {
      server.close(resolve);
    } else {
      resolve();
    }
  });
};

const request = async (endpoint, options = {}) => {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let text;
  let data;
  try {
    text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  } catch (e) {
    text = null;
    data = null;
  }

  return {
    status: response.status,
    ok: response.ok,
    headers: response.headers,
    body: data,
    text,
  };
};

const login = async (email, password = 'password123') => {
  const res = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token;
};

module.exports = {
  startTestServer,
  stopTestServer,
  request,
  login,
};
