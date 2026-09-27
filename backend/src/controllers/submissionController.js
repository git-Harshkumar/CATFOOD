const submissionService = require('../services/submissionService');
const { success } = require('../utils/response');

const createOrUpdateSubmission = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const submission = await submissionService.createOrUpdateSubmission(
      req.user.id,
      req.user,
      teamId,
      req.body
    );
    return success(res, submission, 'Submission saved successfully', 200);
  } catch (err) {
    next(err);
  }
};

const getSubmissionById = async (req, res, next) => {
  try {
    const submission = await submissionService.getSubmissionById(req.params.id, req.user);
    return success(res, submission, 'Submission retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const getSubmissionsByEvent = async (req, res, next) => {
  try {
    const submissions = await submissionService.getSubmissionsByEvent(req.params.eventId, req.user);
    return success(res, submissions, 'Event submissions retrieved successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrUpdateSubmission,
  getSubmissionById,
  getSubmissionsByEvent,
};
