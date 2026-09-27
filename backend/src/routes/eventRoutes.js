const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
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

router.post(
  '/:id/publish-leaderboard',
  authenticate,
  requireRole('ORGANIZER'),
  eventController.publishLeaderboard
);

module.exports = router;
