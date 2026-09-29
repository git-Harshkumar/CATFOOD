const certificateService = require('../services/certificateService');
const { success } = require('../utils/response');
const { listPublicKeys } = require('../utils/cryptoKeys');
const fs = require('fs');
const path = require('path');
const prisma = require('../utils/prisma');

const issueCertificate = async (req, res, next) => {
  try {
    const { eventId, recipientName, recipientEmail, role, metadata } = req.body;
    const certificate = await certificateService.issueCertificate({
      eventId: eventId || req.params.eventId,
      recipientName,
      recipientEmail,
      role: role || 'JUDGE',
      metadata,
      currentUser: req.user,
    });
    return success(res, certificate, 'Certificate issued successfully', 201);
  } catch (err) {
    next(err);
  }
};

const verifyCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const verification = await certificateService.verifyCertificate(id);
    return success(res, verification, 'Certificate verification completed');
  } catch (err) {
    next(err);
  }
};

const revokeCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await certificateService.revokeCertificate({
      certId: id,
      reason,
      currentUser: req.user,
    });
    return success(res, result, 'Certificate revoked successfully');
  } catch (err) {
    next(err);
  }
};

const issueJudgeRecord = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { judgeUserId } = req.body;
    const record = await certificateService.issueJudgeRecord({
      eventId,
      judgeUserId,
      currentUser: req.user,
    });
    return success(res, record, 'Judge participation record issued and signed', 201);
  } catch (err) {
    next(err);
  }
};

const verifyJudgeCertificate = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { eventId } = req.query;
    const verification = await certificateService.verifyJudgeCertificate(userId, eventId);
    return success(res, verification, 'Judge Certificate verification completed');
  } catch (err) {
    next(err);
  }
};

const getEventCertificates = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const certs = await certificateService.getEventCertificates(eventId, req.user);
    return success(res, certs, 'Event certificates retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const getMyCertificates = async (req, res, next) => {
  try {
    const certs = await certificateService.getUserCertificates(req.user.email);
    return success(res, certs, 'Certificates retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const getCertificateArtifact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cert = await prisma.certificate.findUnique({ where: { id } });
    if (!cert || !cert.artifactPath || !fs.existsSync(cert.artifactPath)) {
      return res.status(404).json({ error: 'Certificate artifact not found' });
    }

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${cert.id}.svg"`);
    return res.sendFile(cert.artifactPath);
  } catch (err) {
    next(err);
  }
};

const getSigningKeys = async (req, res, next) => {
  try {
    const keys = await listPublicKeys();
    return res.status(200).json({
      keys,
      service: 'CATFOOD Cryptographic Verification Service',
      algorithm: 'Ed25519',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  issueCertificate,
  verifyCertificate,
  revokeCertificate,
  issueJudgeRecord,
  verifyJudgeCertificate,
  getEventCertificates,
  getMyCertificates,
  getCertificateArtifact,
  getSigningKeys,
};
