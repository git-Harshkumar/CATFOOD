const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const judgingController = require('../controllers/judgingController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { validateEvent, validateCriterion, validatePrize, validateEventQuestion } = require('../validators');

// Public routes (anyone can view active events)
router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);

// Protected routes (organizer only)
router.post(
  '/',
  authenticate,
  requireRole('ORGANIZER'),
  validate(validateEvent),
  eventController.createEvent
);

router.put(
  '/:id',
  authenticate,
  requireRole('ORGANIZER'),
  eventController.updateEvent
);

router.post(
  '/:id/criteria',
  authenticate,
  requireRole('ORGANIZER'),
  validate(validateCriterion),
  eventController.addCriterion
);

router.post(
  '/:id/prizes',
  authenticate,
  requireRole('ORGANIZER'),
  validate(validatePrize),
  eventController.addPrize
);

router.post(
  '/:id/questions',
  authenticate,
  requireRole('ORGANIZER'),
  validate(validateEventQuestion),
  eventController.addEventQuestion
);

router.post(
  '/:id/judges',
  authenticate,
  requireRole('ORGANIZER'),
  eventController.assignJudge
);

router.get(
  '/:id/judges',
  authenticate,
  requireRole('ORGANIZER'),
  (req, res, next) => {
    req.params.eventId = req.params.id;
    judgingController.getEventJudges(req, res, next);
  }
);

router.post(
  '/:id/publish-leaderboard',
  authenticate,
  requireRole('ORGANIZER'),
  eventController.publishLeaderboard
);

// Event Judging & Assignments
router.get(
  '/:id/judging/progress',
  authenticate,
  requireRole('ORGANIZER'),
  (req, res, next) => {
    req.params.eventId = req.params.id;
    judgingController.getJudgingProgress(req, res, next);
  }
);

router.post(
  '/:id/judging/normalize',
  authenticate,
  requireRole('ORGANIZER'),
  (req, res, next) => {
    req.params.eventId = req.params.id;
    judgingController.runNormalization(req, res, next);
  }
);

router.get(
  '/:id/judging/export.csv',
  authenticate,
  requireRole('ORGANIZER'),
  (req, res, next) => {
    req.params.eventId = req.params.id;
    judgingController.exportCsv(req, res, next);
  }
);

router.get(
  '/:id/judge-assignments',
  authenticate,
  requireRole('ORGANIZER'),
  (req, res, next) => {
    req.params.eventId = req.params.id;
    judgingController.getJudgeAssignments(req, res, next);
  }
);

router.post(
  '/:id/judge-assignments/batch',
  authenticate,
  requireRole('ORGANIZER'),
  (req, res, next) => {
    req.params.eventId = req.params.id;
    judgingController.batchAssignJudges(req, res, next);
  }
);

router.post(
  '/:id/judge-assignments/auto',
  authenticate,
  requireRole('ORGANIZER'),
  (req, res, next) => {
    req.params.eventId = req.params.id;
    judgingController.autoAssignJudges(req, res, next);
  }
);

router.delete(
  '/:id/judge-assignments/:assignmentId',
  authenticate,
  requireRole('ORGANIZER'),
  (req, res, next) => {
    req.params.eventId = req.params.id;
    req.params.id = req.params.assignmentId;
    judgingController.removeJudgeAssignment(req, res, next);
  }
);

router.get(
  '/:id/audit-logs',
  authenticate,
  requireRole('ORGANIZER'),
  (req, res, next) => {
    req.params.eventId = req.params.id;
    judgingController.getAuditLogs(req, res, next);
  }
);

module.exports = router;

