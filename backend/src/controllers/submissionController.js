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

const getPublicGallery = async (req, res, next) => {
  try {
    const submissions = await submissionService.getPublicGallery(req.params.eventId, req.query);
    return success(res, submissions, 'Public gallery retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const prisma = require('../utils/prisma');

const handleDirectSubmission = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let event = null;
    let team = null;

    const teamMember = await prisma.teamMember.findFirst({
      where: { userId },
      include: { team: { include: { event: true } } },
    });

    if (teamMember && teamMember.team) {
      team = teamMember.team;
      event = team.event;
    } else {
      event = await prisma.event.findFirst({ orderBy: { id: 'asc' } });
    }

    if (!event) {
      const error = new Error('No active hackathon event found.');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();
    const deadline = new Date(event.deadline);
    const isOrganizer = req.user.isGlobalAdmin || req.user.role === 'ORGANIZER' || event.organizerId === userId;

    if (now > deadline && !isOrganizer) {
      const error = new Error(
        `Submission deadline has passed on ${deadline.toISOString()}. Modifications and late submissions are strictly prohibited.`
      );
      error.statusCode = 403;
      throw error;
    }

    if (event.status === 'COMPLETED' && !isOrganizer) {
      const error = new Error('This hackathon has already concluded. Submissions are closed.');
      error.statusCode = 400;
      throw error;
    }

    if (!team) {
      const error = new Error('Participant must belong to a registered team to submit.');
      error.statusCode = 400;
      throw error;
    }

    const submission = await submissionService.createOrUpdateSubmission(
      userId,
      req.user,
      team.id,
      req.body
    );
    return success(res, submission, 'Project submitted successfully', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrUpdateSubmission,
  getSubmissionById,
  getSubmissionsByEvent,
  getPublicGallery,
  handleDirectSubmission,
};
