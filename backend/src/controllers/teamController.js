const teamService = require('../services/teamService');
const { success } = require('../utils/response');

const createTeam = async (req, res, next) => {
  try {
    const team = await teamService.createTeam(req.user.id, req.body);
    return success(res, team, 'Team created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const joinTeam = async (req, res, next) => {
  try {
    const team = await teamService.joinTeam(req.user.id, req.body.inviteCode);
    return success(res, team, 'Joined team successfully', 200);
  } catch (err) {
    next(err);
  }
};

const generateInviteLinkToken = async (req, res, next) => {
  try {
    const token = await teamService.generateInviteLinkToken(req.params.id, req.user.id);
    return success(res, { token }, 'Invite link token generated successfully', 200);
  } catch (err) {
    next(err);
  }
};

const joinTeamByToken = async (req, res, next) => {
  try {
    const team = await teamService.joinTeamByToken(req.user.id, req.body.token);
    return success(res, team, 'Joined team successfully via link', 200);
  } catch (err) {
    next(err);
  }
};

const getTeamById = async (req, res, next) => {
  try {
    const team = await teamService.getTeamById(req.params.id);
    return success(res, team, 'Team retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const getMyTeams = async (req, res, next) => {
  try {
    const teams = await teamService.getMyTeams(req.user.id);
    return success(res, teams, 'User teams retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const leaveTeam = async (req, res, next) => {
  try {
    const result = await teamService.leaveTeam(req.user.id, req.params.id);
    return success(res, result, result.message);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTeam,
  joinTeam,
  generateInviteLinkToken,
  joinTeamByToken,
  getTeamById,
  getMyTeams,
  leaveTeam,
};
