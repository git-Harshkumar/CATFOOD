const eventService = require('../services/eventService');
const { success } = require('../utils/response');

const getAllEvents = async (req, res, next) => {
  try {
    const events = await eventService.getAllEvents();
    return success(res, events, 'Events retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const getEventById = async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    return success(res, event, 'Event retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const createEvent = async (req, res, next) => {
  try {
    const event = await eventService.createEvent(req.user.id, req.body);
    return success(res, event, 'Event created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const event = await eventService.updateEvent(req.params.id, req.user.id, req.body);
    return success(res, event, 'Event updated successfully');
  } catch (err) {
    next(err);
  }
};

const addCriterion = async (req, res, next) => {
  try {
    const criterion = await eventService.addCriterion(req.params.id, req.user.id, req.body);
    return success(res, criterion, 'Criterion added successfully', 201);
  } catch (err) {
    next(err);
  }
};

const assignJudge = async (req, res, next) => {
  try {
    const assignment = await eventService.assignJudge(req.params.id, req.user.id, req.body.judgeEmail);
    return success(res, assignment, 'Judge assigned successfully', 201);
  } catch (err) {
    next(err);
  }
};

const publishLeaderboard = async (req, res, next) => {
  try {
    const { isLeaderboardPublished = true } = req.body;
    const event = await eventService.publishLeaderboard(req.params.id, req.user.id, isLeaderboardPublished);
    return success(res, event, `Leaderboard ${isLeaderboardPublished ? 'published' : 'un-published'} successfully`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  addCriterion,
  assignJudge,
  publishLeaderboard,
};
