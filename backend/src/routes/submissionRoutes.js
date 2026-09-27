const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { validateSubmission } = require('../validators');

// Public routes
router.get('/gallery/:eventId', submissionController.getPublicGallery);

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

module.exports = router;
