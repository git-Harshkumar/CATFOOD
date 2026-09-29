const express = require('express');
const router = express.Router();
const bulkController = require('../controllers/bulkController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Restore / Re-import complete event bundle (Round-trip data portability)
router.post(
  '/event/import',
  authenticate,
  requireRole('ORGANIZER'),
  bulkController.importEventBundle
);

// Preview import without database mutation
router.post(
  '/:eventId/import/preview',
  authenticate,
  requireRole('ORGANIZER'),
  bulkController.previewImport
);

// Atomic bulk import projects
router.post(
  '/:eventId/import',
  authenticate,
  requireRole('ORGANIZER'),
  bulkController.importProjects
);

// Atomic bulk import judges
router.post(
  '/import/judges/:eventId',
  authenticate,
  requireRole('ORGANIZER'),
  bulkController.importJudges
);

// Bulk export full versioned event bundle
router.get(
  '/:eventId/export',
  authenticate,
  requireRole('ORGANIZER'),
  bulkController.exportEvent
);

module.exports = router;
