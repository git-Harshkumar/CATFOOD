const communityService = require('../services/communityService');
const { success } = require('../utils/response');

const castVote = async (req, res, next) => {
  try {
    const submissionId = req.body.submissionId || req.body.project_id;
    const voterEmail = req.body.voterEmail || req.user?.email || null;
    const eventId = req.params.eventId || req.body.eventId || null;
    const voterIp = req.ip || req.socket?.remoteAddress;
    const credits = req.body.credits;
    const voterToken = req.headers['x-voter-token'] || req.body.voterToken || null;
    const verificationToken = req.body.verificationToken || req.headers['x-verification-token'] || null;

    const result = await communityService.castVote({
      eventId,
      submissionId,
      voterEmail,
      voterIp,
      currentUser: req.user,
      credits,
      voterToken,
      verificationToken,
    });

    return success(res, result, 'Community vote cast successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getCommunityResults = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.query.eventId || null;
    const results = await communityService.getCommunityResults(eventId, req.user);
    return success(res, results, 'Community voting results retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const requestEmailVerification = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.body.eventId || null;
    const { email } = req.body;
    const voterIp = req.ip || req.socket?.remoteAddress;
    const result = await communityService.requestEmailVerification({ eventId, email, voterIp });
    return success(res, result, 'Verification token generated successfully', 200);
  } catch (err) {
    next(err);
  }
};

const confirmEmailVerification = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.body.eventId || null;
    const { email, token } = req.body;
    const result = await communityService.confirmEmailVerification({ eventId, email, token });
    return success(res, result, 'Email verification confirmed successfully', 200);
  } catch (err) {
    next(err);
  }
};

const addComment = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { content, authorName, authorEmail } = req.body;

    const comment = await communityService.addComment({
      submissionId,
      content,
      currentUser: req.user,
      authorName,
      authorEmail,
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

const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const result = await communityService.deleteComment(commentId, req.user);
    return success(res, result, 'Comment removed successfully');
  } catch (err) {
    next(err);
  }
};

const addCommentProxy = async (req, res, next) => {
  try {
    const submissionId = req.body.project_id || req.query.project_id;
    const content = req.body.body || req.body.content;
    const comment = await communityService.addComment({
      submissionId,
      content,
      currentUser: req.user,
    });
    return success(res, comment, 'Comment added successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getCommentsProxy = async (req, res, next) => {
  try {
    const submissionId = req.query.project_id;
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
  requestEmailVerification,
  confirmEmailVerification,
  addComment,
  getComments,
  deleteComment,
  addCommentProxy,
  getCommentsProxy,
  updateVotingSettings,
};
