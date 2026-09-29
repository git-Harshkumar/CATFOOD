const dns = require('dns').promises;
const net = require('net');

/**
 * Validate that an ID is a valid positive integer.
 */
const validateId = (val, fieldName = 'ID') => {
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed <= 0 || String(parsed) !== String(val).trim()) {
    const err = new Error(`Invalid ${fieldName}: must be a positive integer.`);
    err.statusCode = 400;
    throw err;
  }
  return parsed;
};

/**
 * Validate email format strictly.
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    const err = new Error('Email address is required.');
    err.statusCode = 400;
    throw err;
  }
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    const err = new Error('Invalid email address format.');
    err.statusCode = 400;
    throw err;
  }
  return trimmed;
};

/**
 * Check if an IP address is in a private, loopback, link-local, or cloud metadata range.
 */
const isPrivateIp = (ip) => {
  if (!ip) return true;
  
  // IPv4 Checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4) return true;
    
    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link-local / AWS & GCP metadata 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // Broadcast / Multicast
    if (parts[0] >= 224) return true;

    return false;
  }

  // IPv6 Checks
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback ::1
    if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
    // Unspecified ::
    if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;
    // Unique Local fc00::/7 (fc00:: to fdff::)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // Link-local fe80::/10
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
    // IPv4-mapped IPv6 ::ffff:127.0.0.1
    if (lower.includes('::ffff:')) {
      const ipv4Part = lower.split('::ffff:')[1];
      if (ipv4Part && net.isIPv4(ipv4Part)) {
        return isPrivateIp(ipv4Part);
      }
    }
    return false;
  }

  return true;
};

/**
 * Validate a webhook URL against SSRF and private network attacks.
 */
const validateWebhookUrl = async (urlString, allowLocalhostInDev = false) => {
  if (!urlString || typeof urlString !== 'string') {
    const err = new Error('Webhook URL is required.');
    err.statusCode = 400;
    throw err;
  }

  const trimmed = urlString.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (e) {
    const err = new Error('Invalid URL format for webhook.');
    err.statusCode = 400;
    throw err;
  }

  // Enforce protocol
  const isDev = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  if (parsed.protocol !== 'https:' && (!isDev || parsed.protocol !== 'http:')) {
    const err = new Error('Webhook URLs must use secure HTTPS protocol.');
    err.statusCode = 400;
    throw err;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Explicit forbidden hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '169.254.169.254' ||
    hostname === 'metadata.google.internal' ||
    hostname === 'instance-data'
  ) {
    if (!allowLocalhostInDev || !isDev) {
      const err = new Error('Forbidden webhook destination: Localhost and cloud metadata endpoints are strictly prohibited.');
      err.statusCode = 400;
      throw err;
    }
  }

  // Resolve hostname via DNS and check IP
  try {
    const records = await dns.lookup(hostname, { all: true });
    for (const record of records) {
      if (isPrivateIp(record.address)) {
        if (!allowLocalhostInDev || !isDev) {
          const err = new Error(`Forbidden webhook destination: Hostname resolves to private/reserved IP address (${record.address}).`);
          err.statusCode = 400;
          throw err;
        }
      }
    }
  } catch (dnsErr) {
    if (dnsErr.statusCode) throw dnsErr;
    // If DNS resolution fails, reject in production
    if (!isDev) {
      const err = new Error(`Unable to resolve webhook host '${hostname}'.`);
      err.statusCode = 400;
      throw err;
    }
  }

  return trimmed;
};

/**
 * Sanitize text to prevent Spreadsheet Formula Injection (CSV Injection).
 * Any text starting with =, +, -, @, \t, or \r is prefixed with a single quote '.
 */
const sanitizeCsvFormula = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  const firstChar = str.charAt(0);
  if (['=', '+', '-', '@', '\t', '\r'].includes(firstChar)) {
    return `'${str}`;
  }
  return str;
};

/**
 * Escape string for HTML rendering (XSS protection).
 */
const escapeHtml = (str) => {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

module.exports = {
  validateId,
  validateEmail,
  isPrivateIp,
  validateWebhookUrl,
  sanitizeCsvFormula,
  escapeHtml,
};
