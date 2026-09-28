const express = require('express');
const router = express.Router();
const judgingController = require('../controllers/judgingController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { validateScore } = require('../validators');

// Acceptance Checker compatibility endpoints (judge_scores, peer_scores)
router.get(
  '/scores',
  authenticate,
  judgingController.getJudgeScores
);

router.get(
  '/:eventId/scores',
  authenticate,
  judgingController.getJudgeScores
);

// Public or authenticated leaderboard access
router.get('/leaderboard/:eventId', authenticate, judgingController.getLeaderboard);

// Judge evaluation queue
router.get(
  '/queue',
  authenticate,
  requireRole('JUDGE', 'ORGANIZER'),
  judgingController.getJudgeQueue
);

router.get(
  '/:eventId/queue',
  authenticate,
  requireRole('JUDGE', 'ORGANIZER'),
  judgingController.getJudgeQueue
);

// Submission scores
router.get(
  '/scores/:submissionId',
  authenticate,
  requireRole('JUDGE', 'ORGANIZER'),
  judgingController.getSubmissionScores
);

router.get(
  '/:eventId/scores/:submissionId',
  authenticate,
  requireRole('JUDGE', 'ORGANIZER'),
  judgingController.getSubmissionScores
);

// Submit scores
router.post(
  '/score/:submissionId',
  authenticate,
  requireRole('JUDGE'),
  validate(validateScore),
  judgingController.submitScores
);

router.post(
  '/:eventId/score/:submissionId',
  authenticate,
  requireRole('JUDGE'),
  validate(validateScore),
  judgingController.submitScores
);

// Pairwise Judging (Bradley-Terry)
router.post(
  '/pairwise/compare',
  authenticate,
  requireRole('JUDGE'),
  judgingController.recordPairwiseComparison
);

router.post(
  '/:eventId/pairwise/compare',
  authenticate,
  requireRole('JUDGE'),
  judgingController.recordPairwiseComparison
);

router.get(
  '/pairwise/standings',
  authenticate,
  judgingController.getPairwiseStandings
);

router.get(
  '/:eventId/pairwise/standings',
  authenticate,
  judgingController.getPairwiseStandings
);

// Progress Dashboard (Organizer only)
router.get(
  '/progress',
  authenticate,
  requireRole('ORGANIZER'),
  judgingController.getJudgingProgress
);

router.get(
  '/:eventId/progress',
  authenticate,
  requireRole('ORGANIZER'),
  judgingController.getJudgingProgress
);

// Cross-judge Normalization (Organizer only)
router.post(
  '/normalize',
  authenticate,
  requireRole('ORGANIZER'),
  judgingController.runNormalization
);

router.post(
  '/:eventId/normalize',
  authenticate,
  requireRole('ORGANIZER'),
  judgingController.runNormalization
);

// CSV Export (Organizer only)
router.get(
  '/export.csv',
  authenticate,
  requireRole('ORGANIZER'),
  judgingController.exportCsv
);

router.get(
  '/:eventId/export.csv',
  authenticate,
  requireRole('ORGANIZER'),
  judgingController.exportCsv
);

// Judge Assignments
router.get(
  '/:eventId/assignments',
  authenticate,
  requireRole('ORGANIZER'),
  judgingController.getJudgeAssignments
);

router.post(
  '/:eventId/assignments/batch',
  authenticate,
  requireRole('ORGANIZER'),
  judgingController.batchAssignJudges
);

router.post(
  '/:eventId/assignments/auto',
  authenticate,
  requireRole('ORGANIZER'),
  judgingController.autoAssignJudges
);

router.delete(
  '/:eventId/assignments/:id',
  authenticate,
  requireRole('ORGANIZER'),
  judgingController.removeJudgeAssignment
);

// Event Judges & Status
router.get(
  '/:eventId/judges',
  authenticate,
  requireRole('ORGANIZER'),
  judgingController.getEventJudges
);

router.patch(
  '/:eventId/judges/status',
  authenticate,
  judgingController.updateJudgeStatus
);

// Audit Logs
router.get(
  '/audit',
  authenticate,
  requireRole('ORGANIZER'),
  judgingController.getAuditLogs
);

router.get(
  '/:eventId/audit',
  authenticate,
  requireRole('ORGANIZER'),
  judgingController.getAuditLogs
);

module.exports = router;
