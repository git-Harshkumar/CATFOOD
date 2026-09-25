const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Public verification
router.get('/verify/:id', certificateController.verifyCertificate);

// User certificates
router.get('/my', authenticate, certificateController.getMyCertificates);

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

module.exports = router;
