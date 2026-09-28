const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Voting
router.post('/vote', communityController.castVote);
router.post('/:eventId/vote', communityController.castVote);
router.get('/:eventId/results', communityController.getCommunityResults);

// Comments
router.post('/comments/:submissionId', communityController.addComment);
router.get('/comments/:submissionId', communityController.getComments);

// Organizer settings
router.patch(
  '/:eventId/settings',
  authenticate,
  requireRole('ORGANIZER'),
  communityController.updateVotingSettings
);

module.exports = router;
