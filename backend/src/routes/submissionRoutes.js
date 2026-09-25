const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { validateSubmission } = require('../validators');

// Public routes
router.get('/gallery/:eventId', submissionController.getPublicGallery);
router.get('/gallery', submissionController.getPublicGallery);
router.get('/', submissionController.getPublicGallery);

// Public/authenticated view routes
router.get('/event/:eventId', authenticate, submissionController.getSubmissionsByEvent);
router.get('/:id', authenticate, submissionController.getSubmissionById);

// Submit or edit project for a team
router.post(
  '/team/:teamId',
  authenticate,
  validate(validateSubmission),
  submissionController.createOrUpdateSubmission
);

// Direct submit endpoint
router.post(
  '/submit',
  authenticate,
  submissionController.handleDirectSubmission
);
router.post(
  '/',
  authenticate,
  submissionController.handleDirectSubmission
);

module.exports = router;
