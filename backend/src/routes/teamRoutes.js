const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { validateTeam, validateJoinTeam } = require('../validators');

// All team routes require authentication
router.use(authenticate);

router.post('/', validate(validateTeam), teamController.createTeam);
router.post('/join', validate(validateJoinTeam), teamController.joinTeam);
router.post('/join-link', teamController.joinTeamByToken);
router.get('/my-teams', teamController.getMyTeams);
router.get('/:id/invite-link', teamController.generateInviteLinkToken);
router.get('/:id', teamController.getTeamById);
router.post('/:id/leave', teamController.leaveTeam);

module.exports = router;
