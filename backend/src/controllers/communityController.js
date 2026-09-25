const communityService = require('../services/communityService');
const { success } = require('../utils/response');

const castVote = async (req, res, next) => {
  try {
    const { submissionId, voterEmail } = req.body;
    const eventId = req.params.eventId || req.body.eventId;
    const voterIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const result = await communityService.castVote({
      eventId,
      submissionId,
      voterEmail,
      voterIp,
      currentUser: req.user,
    });

    return success(res, result, 'Community vote cast successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getCommunityResults = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const results = await communityService.getCommunityResults(eventId, req.user);
    return success(res, results, 'Community voting results retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const addComment = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { authorName, authorEmail, content } = req.body;

    const comment = await communityService.addComment({
      submissionId,
      authorName,
      authorEmail,
      content,
      currentUser: req.user,
    });

    return success(res, comment, 'Comment added successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getComments = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const comments = await communityService.getComments(submissionId);
    return success(res, comments, 'Comments retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const updateVotingSettings = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const updated = await communityService.updateVotingSettings(eventId, req.body, req.user);
    return success(res, updated, 'Community voting settings updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  castVote,
  getCommunityResults,
  addComment,
  getComments,
  updateVotingSettings,
};
