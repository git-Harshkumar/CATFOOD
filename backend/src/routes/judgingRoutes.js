const express = require('express');
const router = express.Router();
const judgingController = require('../controllers/judgingController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { validateScore } = require('../validators');

// Public or authenticated leaderboard access (controlled by isLeaderboardPublished inside service)
router.get('/leaderboard/:eventId', authenticate, judgingController.getLeaderboard);

// Judge-only routes
router.get(
  '/queue',
  authenticate,
  requireRole('JUDGE', 'ORGANIZER'),
  judgingController.getJudgeQueue
);

router.get(
  '/scores/:submissionId',
  authenticate,
  requireRole('JUDGE', 'ORGANIZER'),
  judgingController.getSubmissionScores
);

router.post(
  '/score/:submissionId',
  authenticate,
  requireRole('JUDGE'),
  validate(validateScore),
  judgingController.submitScores
);

module.exports = router;
