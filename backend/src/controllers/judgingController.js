const judgingService = require('../services/judgingService');
const eventService = require('../services/eventService');
const auditService = require('../services/auditService');
const { success } = require('../utils/response');
const prisma = require('../utils/prisma');

const submitScores = async (req, res, next) => {
  try {
    let { eventId, submissionId } = req.params;
    if (!eventId && submissionId) {
      const sub = await prisma.submission.findUnique({
        where: { id: parseInt(submissionId, 10) },
        select: { eventId: true },
      });
      if (sub) eventId = sub.eventId;
    }
    const scores = await judgingService.submitScores(eventId, req.user.id, submissionId, req.body.scores);
    return success(res, scores, 'Scores submitted successfully', 200);
  } catch (err) {
    next(err);
  }
};

const getSubmissionScores = async (req, res, next) => {
  try {
    let { eventId, submissionId } = req.params;
    if (!eventId && submissionId) {
      const sub = await prisma.submission.findUnique({
        where: { id: parseInt(submissionId, 10) },
        select: { eventId: true },
      });
      if (sub) eventId = sub.eventId;
    }
    const scores = await judgingService.getSubmissionScoresByJudge(eventId, submissionId, req.user.id);
    return success(res, scores, 'Submission scores retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Get judge scores securely.
 * Supports DOGFOOD acceptance checker routes: judge_scores, peer_scores
 */
const getJudgeScores = async (req, res, next) => {
  try {
    const scores = await judgingService.getJudgeScoresSecurely(req.user, req.query, req.params.eventId);
    return success(res, scores, 'Judge scores retrieved successfully', 200);
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
    const { eventId } = req.params;
    const queue = await judgingService.getJudgeQueue(eventId, req.user.id);
    return success(res, queue, 'Judge evaluation queue retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const getJudgingProgress = async (req, res, next) => {
  try {
    let eventId = req.params.eventId || req.query.eventId;
    if (!eventId) {
      // Find first event organized by user
      const evt = await prisma.event.findFirst({
        where: { organizerId: req.user.id },
        select: { id: true },
      });
      if (evt) eventId = evt.id;
    }

    if (!eventId) {
      const error = new Error('Event ID is required to view judging progress.');
      error.statusCode = 400;
      throw error;
    }

    const progress = await judgingService.getJudgingProgress(eventId, req.user);
    return success(res, progress, 'Judging progress retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const runNormalization = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await judgingService.runEventNormalization(eventId, req.user.id);
    return success(res, result, 'Score normalization executed successfully');
  } catch (err) {
    next(err);
  }
};

const exportCsv = async (req, res, next) => {
  try {
    let eventId = req.params.eventId || req.query.eventId;
    if (!eventId) {
      const evt = await prisma.event.findFirst({
        where: { organizerId: req.user.id },
        select: { id: true },
      });
      if (evt) eventId = evt.id;
    }

    if (!eventId) {
      const error = new Error('Event ID is required for CSV export.');
      error.statusCode = 400;
      throw error;
    }

    const type = req.query.type || 'results';
    const { filename, csvContent } = await judgingService.exportJudgingCsv(eventId, type, req.user);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

const batchAssignJudges = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await eventService.batchAssignJudges(eventId, req.user.id, req.body);
    return success(res, result, 'Judges batch assigned successfully', 201);
  } catch (err) {
    next(err);
  }
};

const autoAssignJudges = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await eventService.autoAssignJudges(eventId, req.user.id, req.body);
    return success(res, result, 'Judges automatically assigned successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getJudgeAssignments = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const assignments = await eventService.getJudgeAssignments(eventId, req.user.id);
    return success(res, assignments, 'Judge assignments retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const removeJudgeAssignment = async (req, res, next) => {
  try {
    const { eventId, id } = req.params;
    const result = await eventService.removeJudgeAssignment(eventId, req.user.id, id);
    return success(res, result, 'Judge assignment removed successfully');
  } catch (err) {
    next(err);
  }
};

const getEventJudges = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const judges = await eventService.getEventJudges(eventId, req.user.id);
    return success(res, judges, 'Event judges retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const updateJudgeStatus = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;
    const updated = await eventService.updateJudgeStatus(eventId, req.user.id, status);
    return success(res, updated, 'Judge status updated successfully');
  } catch (err) {
    next(err);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await auditService.getAuditLogs({
      actorId: req.query.actorId,
      action: req.query.action,
      targetType: req.query.targetType,
      limit: req.query.limit,
    });
    return success(res, logs, 'Audit logs retrieved successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitScores,
  getSubmissionScores,
  getJudgeScores,
  getLeaderboard,
  getJudgeQueue,
  getJudgingProgress,
  runNormalization,
  exportCsv,
  batchAssignJudges,
  autoAssignJudges,
  getJudgeAssignments,
  removeJudgeAssignment,
  getEventJudges,
  updateJudgeStatus,
  getAuditLogs,
};
