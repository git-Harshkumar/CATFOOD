const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Public verification
router.get('/verify/:id', certificateController.verifyCertificate);
router.get('/judge/:userId/verify', certificateController.verifyJudgeCertificate);
router.get('/:id/artifact', certificateController.getCertificateArtifact);

// Authenticated user certificates
router.get('/', authenticate, certificateController.getMyCertificates);

// Organizer event certificates
router.get(
  '/event/:eventId',
  authenticate,
  requireRole('ORGANIZER'),
  certificateController.getEventCertificates
);

// Issue certificate (Organizer only)
router.post(
  '/issue',
  authenticate,
  requireRole('ORGANIZER'),
  certificateController.issueCertificate
);

router.post(
  '/:eventId/issue',
  authenticate,
  requireRole('ORGANIZER'),
  certificateController.issueCertificate
);

// Issue judge record (Organizer only)
router.post(
  '/judge-record/:eventId',
  authenticate,
  requireRole('ORGANIZER'),
  certificateController.issueJudgeRecord
);

// Revoke certificate (Organizer only)
router.post(
  '/:id/revoke',
  authenticate,
  requireRole('ORGANIZER'),
  certificateController.revokeCertificate
);

module.exports = router;
