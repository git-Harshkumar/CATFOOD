const judgingService = require('../services/judgingService');
const { success } = require('../utils/response');

const submitScores = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const scores = await judgingService.submitScores(req.user.id, submissionId, req.body.scores);
    return success(res, scores, 'Scores submitted successfully', 200);
  } catch (err) {
    next(err);
  }
};

const getSubmissionScores = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const scores = await judgingService.getSubmissionScoresByJudge(submissionId, req.user.id);
    return success(res, scores, 'Submission scores retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const leaderboard = await judgingService.getLeaderboard(eventId, req.user);
    return success(res, leaderboard, 'Leaderboard retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const getJudgeQueue = async (req, res, next) => {
  try {
    const queue = await judgingService.getJudgeQueue(req.user.id);
    return success(res, queue, 'Judge evaluation queue retrieved successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitScores,
  getSubmissionScores,
  getLeaderboard,
  getJudgeQueue,
};
