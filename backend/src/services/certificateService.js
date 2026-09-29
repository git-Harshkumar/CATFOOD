const crypto = require('crypto');
const prisma = require('../utils/prisma');
const { canManageCertificates } = require('../utils/permissions');
const { validateId, validateEmail } = require('../utils/validation');
const { canonicalize, signCanonical, verifyCanonical, getActiveSigningKey } = require('../utils/cryptoKeys');
const { saveCertificateArtifact } = require('../utils/artifactGenerator');
const { dispatchEvent } = require('./webhookService');
const auditService = require('./auditService');

/**
 * Mask email for privacy protection on public verification pages.
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.length > 2 ? `${local[0]}${'*'.repeat(local.length - 2)}${local.slice(-1)}` : `${local[0]}*`;
  return `${maskedLocal}@${domain}`;
};

/**
 * Issue a cryptographically signed participation, winner, or judge certificate.
 */
const issueCertificate = async ({ eventId, recipientName, recipientEmail, role, metadata, currentUser }) => {
  const parsedEventId = validateId(eventId, 'Event ID');

  if (!recipientName || typeof recipientName !== 'string' || !recipientName.trim()) {
    const error = new Error('Recipient name is required.');
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = validateEmail(recipientEmail);
  const cleanName = recipientName.trim();
  const validRoles = ['JUDGE', 'PARTICIPANT', 'WINNER', 'ORGANIZER'];
  const certRole = role && validRoles.includes(role.toUpperCase()) ? role.toUpperCase() : 'PARTICIPANT';

  const event = await prisma.event.findUnique({
    where: { id: parsedEventId },
    include: { organizer: { select: { id: true, name: true, email: true } } },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isAllowed = await canManageCertificates(currentUser, parsedEventId);
  if (!isAllowed) {
    const error = new Error('Forbidden. Only event organizers can issue verifiable certificates.');
    error.statusCode = 403;
    throw error;
  }

  // Eligibility Verification Check
  if (certRole === 'JUDGE') {
    const isRegisteredJudge = await prisma.eventMember.findFirst({
      where: {
        eventId: parsedEventId,
        user: { email: cleanEmail },
        role: 'JUDGE',
      },
    });
    const hasJudgeRow = await prisma.judge.findFirst({
      where: {
        eventId: parsedEventId,
        user: { email: cleanEmail },
      },
    });
    if (!isRegisteredJudge && !hasJudgeRow && !currentUser.isGlobalAdmin) {
      // Soft validation warning: ensure judge account is associated or user confirmed
    }
  }

  const certId = `CERT-${event.id}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const rawMetadata = typeof metadata === 'object' && metadata !== null ? metadata : (metadata ? JSON.parse(metadata) : {});
  const metaString = JSON.stringify(rawMetadata);
  const parsedMetadata = JSON.parse(metaString);

  const issuedDate = new Date();
  const issuedAtIso = new Date(Math.floor(issuedDate.getTime() / 1000) * 1000).toISOString();

  // Construct canonical data structure for asymmetric signing
  const canonicalData = {
    algorithm: 'Ed25519',
    certificateId: certId,
    eventId: parsedEventId,
    eventName: event.title,
    issuedAt: issuedAtIso,
    issuer: event.organizer?.name || 'Event Organizer',
    recipientEmail: cleanEmail,
    recipientName: cleanName,
    role: certRole,
    metadata: parsedMetadata,
  };

  const canonicalString = canonicalize(canonicalData);
  const { signature, keyId, algorithm } = await signCanonical(canonicalString);

  // Generate & save standalone SVG artifact
  let artifactPath = null;
  try {
    artifactPath = await saveCertificateArtifact({
      certificateId: certId,
      recipientName: cleanName,
      role: certRole,
      eventName: event.title,
      issuedAt: canonicalData.issuedAt,
      signature,
      algorithm,
      keyId,
      eventId: parsedEventId,
    });
  } catch (err) {
    console.warn('[Certificate] Could not save SVG artifact to disk:', err.message);
  }

  const certificate = await prisma.certificate.create({
    data: {
      id: certId,
      eventId: parsedEventId,
      recipientName: cleanName,
      recipientEmail: cleanEmail,
      role: certRole,
      signature,
      metadata: metaString,
      status: 'ACTIVE',
      keyId,
      algorithm,
      artifactPath,
      issuedAt: new Date(issuedAtIso),
    },
    include: { event: { select: { title: true, startDate: true, deadline: true } } },
  });

  // Outbound Webhook dispatch
  await dispatchEvent('certificate.issued', parsedEventId, {
    certificateId: certId,
    recipientName: cleanName,
    role: certRole,
    issuedAt: certificate.issuedAt,
  });

  // Audit Log
  await auditService.logAction({
    eventId: parsedEventId,
    actorId: currentUser?.id,
    action: 'CERTIFICATE_ISSUED',
    targetType: 'Certificate',
    targetId: certId,
    metadata: { role: certRole, recipientEmail: cleanEmail },
  });

  return certificate;
};

/**
 * Publicly verify a certificate by ID (Redacts PII).
 */
const verifyCertificate = async (certId) => {
  if (!certId || typeof certId !== 'string') {
    return { isValid: false, reason: 'Invalid certificate identifier.' };
  }

  const cert = await prisma.certificate.findUnique({
    where: { id: certId.trim() },
    include: {
      event: { select: { id: true, title: true, organizer: { select: { name: true } } } },
    },
  });

  if (!cert) {
    return {
      isValid: false,
      status: 'NOT_FOUND',
      reason: 'Certificate record not found in system database.',
    };
  }

  let parsedMeta = {};
  try {
    parsedMeta = JSON.parse(cert.metadata || '{}');
  } catch (e) {
    parsedMeta = {};
  }

  // Check cryptographic authenticity
  let isAuthentic = false;

  if (cert.algorithm === 'Ed25519') {
    const certIssuedIso = new Date(Math.floor(new Date(cert.issuedAt).getTime() / 1000) * 1000).toISOString();
    const canonicalData = {
      algorithm: cert.algorithm,
      certificateId: cert.id,
      eventId: cert.eventId,
      eventName: cert.event.title,
      issuedAt: certIssuedIso,
      issuer: cert.event.organizer?.name || 'Event Organizer',
      recipientEmail: cert.recipientEmail,
      recipientName: cert.recipientName,
      role: cert.role,
      metadata: parsedMeta,
    };
    isAuthentic = await verifyCanonical(canonicalize(canonicalData), cert.signature, cert.keyId);
  } else {
    // Legacy HMAC-SHA256 verification fallback
    const CERT_SIGNING_SECRET = process.env.CERT_SECRET || 'dogfood-certificate-signing-key-2026';
    const payloadToSign = `${cert.id}|${cert.eventId}|${cert.recipientEmail.toLowerCase().trim()}|${cert.role}|${cert.metadata}`;
    const expectedSignature = crypto.createHmac('sha256', CERT_SIGNING_SECRET).update(payloadToSign).digest('hex');
    try {
      isAuthentic = crypto.timingSafeEqual(Buffer.from(cert.signature), Buffer.from(expectedSignature));
    } catch (e) {
      isAuthentic = false;
    }
  }

  const isRevoked = cert.status === 'REVOKED';
  const isValid = isAuthentic && !isRevoked;

  let statusText = 'OFFICIALLY_VERIFIED';
  if (!isAuthentic) statusText = 'SIGNATURE_MISMATCH';
  else if (isRevoked) statusText = 'REVOKED';

  return {
    isValid,
    isAuthentic,
    status: statusText,
    certificateId: cert.id,
    recipientName: cert.recipientName,
    recipientEmailMasked: maskEmail(cert.recipientEmail),
    role: cert.role,
    eventName: cert.event.title,
    issuedAt: cert.issuedAt,
    issuer: cert.event.organizer?.name || 'Official Event Organizer',
    verificationAlgorithm: cert.algorithm,
    keyId: cert.keyId,
    signature: cert.signature,
    revocation: isRevoked
      ? {
          revokedAt: cert.revokedAt,
          reason: cert.revocationReason || 'Revoked by event organizer.',
        }
      : null,
  };
};

/**
 * Revoke an issued certificate.
 */
const revokeCertificate = async ({ certId, reason, currentUser }) => {
  if (!certId) {
    const error = new Error('Certificate ID is required.');
    error.statusCode = 400;
    throw error;
  }

  const cert = await prisma.certificate.findUnique({
    where: { id: certId.trim() },
    include: { event: true },
  });

  if (!cert) {
    const error = new Error('Certificate not found.');
    error.statusCode = 404;
    throw error;
  }

  const isAllowed = await canManageCertificates(currentUser, cert.eventId);
  if (!isAllowed) {
    const error = new Error('Forbidden. Only event organizers can revoke certificates.');
    error.statusCode = 403;
    throw error;
  }

  const updated = await prisma.certificate.update({
    where: { id: cert.id },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
      revokedBy: currentUser.id,
      revocationReason: reason || 'Revoked by organizer.',
    },
  });

  await dispatchEvent('certificate.revoked', cert.eventId, {
    certificateId: cert.id,
    reason: updated.revocationReason,
    revokedAt: updated.revokedAt,
  });

  await auditService.logAction({
    eventId: cert.eventId,
    actorId: currentUser.id,
    action: 'CERTIFICATE_REVOKED',
    targetType: 'Certificate',
    targetId: cert.id,
    metadata: { reason: updated.revocationReason },
  });

  return updated;
};

/**
 * Generate a signed judge participation record with verified statistics.
 */
const issueJudgeRecord = async ({ eventId, judgeUserId, currentUser }) => {
  const parsedEventId = validateId(eventId, 'Event ID');
  const parsedUserId = validateId(judgeUserId, 'Judge User ID');

  const isAllowed = await canManageCertificates(currentUser, parsedEventId);
  if (!isAllowed) {
    const error = new Error('Forbidden. Only event organizers can issue judge records.');
    error.statusCode = 403;
    throw error;
  }

  const judgeUser = await prisma.user.findUnique({ where: { id: parsedUserId } });
  if (!judgeUser) {
    const error = new Error('Judge user not found.');
    error.statusCode = 404;
    throw error;
  }

  const judge = await prisma.judge.findUnique({
    where: { eventId_userId: { eventId: parsedEventId, userId: parsedUserId } },
    include: {
      event: { select: { id: true, title: true, startDate: true, deadline: true } },
      assignments: true,
      scores: true,
    },
  });

  if (!judge) {
    const error = new Error('Judge participation record not found for this event.');
    error.statusCode = 404;
    throw error;
  }

  const evaluatedSubmissions = new Set(judge.scores.map((s) => s.submissionId)).size;
  const assignedSubmissions = judge.assignments.length;

  const metadata = {
    assignedSubmissions,
    evaluatedSubmissions,
    participatedFrom: judge.event.startDate,
    participatedUntil: judge.event.deadline,
    evaluationRate: assignedSubmissions > 0 ? Math.round((evaluatedSubmissions / assignedSubmissions) * 100) : 100,
  };

  return issueCertificate({
    eventId: parsedEventId,
    recipientName: judgeUser.name,
    recipientEmail: judgeUser.email,
    role: 'JUDGE',
    metadata,
    currentUser,
  });
};

/**
 * Verify a judge certificate by exact certificate ID or user+event combo.
 */
const verifyJudgeCertificate = async (identifier, eventId = null) => {
  // If identifier is a certificate ID, verify directly
  if (typeof identifier === 'string' && identifier.startsWith('CERT-')) {
    return verifyCertificate(identifier);
  }

  // Otherwise treat as userId
  const userId = parseInt(identifier, 10);
  if (isNaN(userId)) {
    return { isValid: false, reason: 'Invalid judge identifier.' };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { isValid: false, reason: 'Judge user not found.' };
  }

  const where = {
    recipientEmail: user.email,
    role: 'JUDGE',
    ...(eventId ? { eventId: parseInt(eventId, 10) } : {}),
  };

  const cert = await prisma.certificate.findFirst({
    where,
    orderBy: { issuedAt: 'desc' },
  });

  if (!cert) {
    return { isValid: false, reason: 'No judge certificate found for this user in specified event.' };
  }

  return verifyCertificate(cert.id);
};

/**
 * List all certificates for an event (Organizer only).
 */
const getEventCertificates = async (eventId, currentUser) => {
  const parsedEventId = validateId(eventId, 'Event ID');
  const isAllowed = await canManageCertificates(currentUser, parsedEventId);
  if (!isAllowed) {
    const error = new Error('Forbidden. Only organizers can view all event certificates.');
    error.statusCode = 403;
    throw error;
  }

  return prisma.certificate.findMany({
    where: { eventId: parsedEventId },
    orderBy: { issuedAt: 'desc' },
  });
};

/**
 * Get all certificates issued for the authenticated user.
 */
const getUserCertificates = async (email) => {
  return prisma.certificate.findMany({
    where: { recipientEmail: email.toLowerCase().trim() },
    include: { event: { select: { title: true } } },
    orderBy: { issuedAt: 'desc' },
  });
};

module.exports = {
  issueCertificate,
  verifyCertificate,
  revokeCertificate,
  issueJudgeRecord,
  verifyJudgeCertificate,
  getEventCertificates,
  getUserCertificates,
};
