const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Community Voting
router.post('/vote', optionalAuthenticate, communityController.castVote);
router.post('/:eventId/vote', optionalAuthenticate, communityController.castVote);
router.get('/results', optionalAuthenticate, communityController.getCommunityResults);
router.get('/:eventId/results', optionalAuthenticate, communityController.getCommunityResults);

// Email Verification for EMAIL-gated voting
router.post('/verify-email/request', communityController.requestEmailVerification);
router.post('/:eventId/verify-email/request', communityController.requestEmailVerification);
router.post('/verify-email/confirm', communityController.confirmEmailVerification);
router.post('/:eventId/verify-email/confirm', communityController.confirmEmailVerification);

// Project Comments
router.post('/comments/:submissionId', authenticate, communityController.addComment);
router.get('/comments/:submissionId', communityController.getComments);
router.delete('/comments/:commentId', authenticate, communityController.deleteComment);
router.post('/comments_proxy', authenticate, communityController.addCommentProxy);
router.get('/comments_proxy', communityController.getCommentsProxy);

// Organizer settings
router.patch(
  '/:eventId/settings',
  authenticate,
  requireRole('ORGANIZER'),
  communityController.updateVotingSettings
);

module.exports = router;
