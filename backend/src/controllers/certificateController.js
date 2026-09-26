const certificateService = require('../services/certificateService');
const { success } = require('../utils/response');

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

const verifyJudgeCertificate = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const verification = await certificateService.verifyJudgeCertificate(userId);
    return success(res, verification, 'Judge Certificate verification completed');
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

module.exports = {
  issueCertificate,
  verifyCertificate,
  verifyJudgeCertificate,
  getMyCertificates,
};
