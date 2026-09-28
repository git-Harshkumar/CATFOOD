const crypto = require('crypto');
const prisma = require('../utils/prisma');

const CERT_SIGNING_SECRET = process.env.CERT_SECRET || 'dogfood-certificate-signing-key-2026';

/**
 * Generate a cryptographically signed participation or judging certificate.
 */
const issueCertificate = async ({ eventId, recipientName, recipientEmail, role, metadata, currentUser }) => {
  const parsedEventId = parseInt(eventId, 10);
  const event = await prisma.event.findUnique({ where: { id: parsedEventId } });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isOrganizer = currentUser?.isGlobalAdmin || event.organizerId === currentUser?.id;
  if (!isOrganizer) {
    const error = new Error('Forbidden. Only organizers can issue verifiable certificates.');
    error.statusCode = 403;
    throw error;
  }

  const certId = `CERT-${event.id}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const metaString = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata || '{}';

  // Compute HMAC digital signature across canonical record: certId | eventId | email | role | metadata
  const payloadToSign = `${certId}|${parsedEventId}|${recipientEmail.toLowerCase().trim()}|${role}|${metaString}`;
  const signature = crypto
    .createHmac('sha256', CERT_SIGNING_SECRET)
    .update(payloadToSign)
    .digest('hex');

  const certificate = await prisma.certificate.create({
    data: {
      id: certId,
      eventId: parsedEventId,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.toLowerCase().trim(),
      role,
      signature,
      metadata: metaString,
    },
    include: { event: { select: { title: true, startDate: true, deadline: true } } },
  });

  return certificate;
};

/**
 * Verify a certificate by ID and validate its cryptographic signature.
 */
const verifyCertificate = async (certId) => {
  const cert = await prisma.certificate.findUnique({
    where: { id: certId },
    include: {
      event: { select: { id: true, title: true, organizer: { select: { name: true, email: true } } } },
    },
  });

  if (!cert) {
    return {
      isValid: false,
      reason: 'Certificate record not found in system database.',
    };
  }

  const payloadToSign = `${cert.id}|${cert.eventId}|${cert.recipientEmail.toLowerCase().trim()}|${cert.role}|${cert.metadata}`;
  const expectedSignature = crypto
    .createHmac('sha256', CERT_SIGNING_SECRET)
    .update(payloadToSign)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(cert.signature),
    Buffer.from(expectedSignature)
  );

  let parsedMeta = {};
  try {
    parsedMeta = JSON.parse(cert.metadata);
  } catch (e) {
    parsedMeta = {};
  }

  return {
    isValid,
    certificateId: cert.id,
    recipientName: cert.recipientName,
    recipientEmail: cert.recipientEmail,
    role: cert.role,
    eventName: cert.event.title,
    issuedAt: cert.issuedAt,
    metadata: parsedMeta,
    issuer: cert.event.organizer.name,
    verificationAlgorithm: 'HMAC-SHA256',
    status: isValid ? 'OFFICIALLY_VERIFIED' : 'SIGNATURE_MISMATCH',
  };
};

/**
 * Get all certificates issued for a user.
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
  getUserCertificates,
};
