/**
 * Anti-Abuse Rate Limiting Service
 * Provides token-bucket / sliding-window rate limiting with memory-safe TTL eviction.
 * Designed with a clean storage abstraction ready for Redis or cluster distribution.
 */

class MemoryStore {
  constructor() {
    this.hits = new Map();
    // Periodic sweep every 60 seconds to evict expired IP/token histories and prevent memory leaks
    this.sweepInterval = setInterval(() => this.sweep(), 60 * 1000);
    if (this.sweepInterval.unref) {
      this.sweepInterval.unref();
    }
  }

  sweep() {
    const now = Date.now();
    for (const [key, data] of this.hits.entries()) {
      if (now - data.lastUpdated > data.windowMs) {
        this.hits.delete(key);
      }
    }
  }

  hit(key, windowMs) {
    const now = Date.now();
    let record = this.hits.get(key);
    if (!record || now - record.lastUpdated > windowMs) {
      record = { timestamps: [now], windowMs, lastUpdated: now };
      this.hits.set(key, record);
      return record.timestamps;
    }

    // Filter to sliding window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    record.timestamps.push(now);
    record.lastUpdated = now;
    return record.timestamps;
  }

  get(key, windowMs) {
    const now = Date.now();
    const record = this.hits.get(key);
    if (!record) return [];
    return record.timestamps.filter((ts) => now - ts < windowMs);
  }

  reset(key) {
    if (key) {
      this.hits.delete(key);
    } else {
      this.hits.clear();
    }
  }
}

const store = new MemoryStore();

/**
 * Check if an action is within rate limits.
 * @param {string} key Identifier e.g. "vote:ip:127.0.0.1" or "comments:user:42"
 * @param {number} maxRequests Maximum allowed requests in window
 * @param {number} windowMs Time window in milliseconds
 * @returns {{ allowed: boolean, count: number, remaining: number, resetAt: number }}
 */
const checkRateLimit = (key, maxRequests = 30, windowMs = 60 * 60 * 1000) => {
  const timestamps = store.hit(key, windowMs);
  const count = timestamps.length;
  const allowed = count <= maxRequests;
  const oldest = timestamps[0] || Date.now();
  const resetAt = oldest + windowMs;
  const remaining = Math.max(0, maxRequests - count);

  return {
    allowed,
    count,
    remaining,
    resetAt,
  };
};

/**
 * Enforce rate limit, throwing HTTP 429 Error if exceeded.
 * @param {string} key Identifier
 * @param {number} maxRequests Max requests
 * @param {number} windowMs Time window in ms
 * @param {string} [errorMessage] Custom error message
 */
const enforceRateLimit = (
  key,
  maxRequests = 30,
  windowMs = 60 * 60 * 1000,
  errorMessage = 'Too many requests. Please wait and try again later.'
) => {
  const result = checkRateLimit(key, maxRequests, windowMs);
  if (!result.allowed) {
    const error = new Error(errorMessage);
    error.statusCode = 429;
    error.retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    throw error;
  }
  return result;
};

const resetRateLimit = (key) => {
  store.reset(key);
};

module.exports = {
  checkRateLimit,
  enforceRateLimit,
  resetRateLimit,
};
