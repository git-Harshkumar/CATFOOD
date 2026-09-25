const express = require('express');
const router = express.Router();
const bulkController = require('../controllers/bulkController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.post(
  '/import/projects/:eventId',
  authenticate,
  requireRole('ORGANIZER'),
  bulkController.importProjects
);

router.post(
  '/import/judges/:eventId',
  authenticate,
  requireRole('ORGANIZER'),
  bulkController.importJudges
);

router.get(
  '/export/event/:eventId',
  authenticate,
  requireRole('ORGANIZER'),
  bulkController.exportEvent
);

module.exports = router;
