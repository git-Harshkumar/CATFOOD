const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const prisma = require('./prisma');

// In-memory key cache
let activeKeyPair = null;
const keyRegistry = new Map();

/**
 * Deterministically canonicalize any JavaScript object or value (RFC 8785 style).
 */
const canonicalize = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (obj instanceof Date) {
    return JSON.stringify(obj.toISOString());
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalize).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
};

/**
 * Initialize or load active Ed25519 key pair.
 */
const initSigningKeys = async () => {
  if (activeKeyPair) return activeKeyPair;

  const keyId = process.env.ED25519_KEY_ID || 'catfood-key-2026-v1';

  // Check if active key already exists in database
  let dbKey = await prisma.signingKey.findUnique({
    where: { keyId },
  }).catch(() => null);

  let privateKeyPem;
  let publicKeyPem;

  if (process.env.ED25519_PRIVATE_KEY && process.env.ED25519_PUBLIC_KEY) {
    privateKeyPem = process.env.ED25519_PRIVATE_KEY.replace(/\\n/g, '\n');
    publicKeyPem = process.env.ED25519_PUBLIC_KEY.replace(/\\n/g, '\n');
  } else {
    // Generate a secure Ed25519 keypair for the platform
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    publicKeyPem = publicKey;
    privateKeyPem = privateKey;
  }

  // Register in DB if absent
  if (!dbKey) {
    dbKey = await prisma.signingKey.create({
      data: {
        keyId,
        algorithm: 'Ed25519',
        publicKey: publicKeyPem,
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    }).catch(() => null);
  }

  activeKeyPair = {
    keyId,
    algorithm: 'Ed25519',
    publicKey: publicKeyPem,
    privateKey: privateKeyPem,
  };

  keyRegistry.set(keyId, activeKeyPair);
  return activeKeyPair;
};

/**
 * Get the active signing key.
 */
const getActiveSigningKey = async () => {
  if (!activeKeyPair) {
    await initSigningKeys();
  }
  return activeKeyPair;
};

/**
 * Resolve public key by keyId for verification (supports key rotation).
 */
const getPublicKey = async (keyId) => {
  if (!keyId) {
    const active = await getActiveSigningKey();
    return active.publicKey;
  }

  if (keyRegistry.has(keyId)) {
    return keyRegistry.get(keyId).publicKey;
  }

  // Lookup in database
  const dbKey = await prisma.signingKey.findUnique({ where: { keyId } });
  if (dbKey) {
    return dbKey.publicKey;
  }

  // Fallback to active key if matches
  const active = await getActiveSigningKey();
  if (active.keyId === keyId) return active.publicKey;

  return null;
};

/**
 * Sign canonical data using Ed25519.
 */
const signCanonical = async (canonicalPayload) => {
  const active = await getActiveSigningKey();
  const bufferToSign = Buffer.from(canonicalPayload, 'utf8');
  const signature = crypto.sign(null, bufferToSign, active.privateKey).toString('hex');

  return {
    signature,
    keyId: active.keyId,
    algorithm: active.algorithm,
  };
};

/**
 * Verify canonical data using Ed25519.
 */
const verifyCanonical = async (canonicalPayload, signatureHex, keyId) => {
  try {
    const publicKey = await getPublicKey(keyId);
    if (!publicKey) return false;

    const bufferToVerify = Buffer.from(canonicalPayload, 'utf8');
    const signatureBuffer = Buffer.from(signatureHex, 'hex');

    return crypto.verify(null, bufferToVerify, publicKey, signatureBuffer);
  } catch (err) {
    return false;
  }
};

/**
 * List all public keys for the /.well-known/signing-keys endpoint.
 */
const listPublicKeys = async () => {
  await getActiveSigningKey();
  const keys = await prisma.signingKey.findMany({
    select: {
      keyId: true,
      algorithm: true,
      publicKey: true,
      status: true,
      createdAt: true,
      activatedAt: true,
      retiredAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return keys;
};

module.exports = {
  canonicalize,
  getActiveSigningKey,
  getPublicKey,
  signCanonical,
  verifyCanonical,
  listPublicKeys,
};
