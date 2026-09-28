const bulkService = require('../services/bulkService');
const { success } = require('../utils/response');

const importProjects = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { projects } = req.body;
    const result = await bulkService.bulkImportProjects(eventId, projects || req.body, req.user);
    return success(res, result, 'Projects imported successfully', 201);
  } catch (err) {
    next(err);
  }
};

const importJudges = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { judges } = req.body;
    const result = await bulkService.bulkImportJudges(eventId, judges || req.body, req.user);
    return success(res, result, 'Judges imported successfully', 201);
  } catch (err) {
    next(err);
  }
};

const exportEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const bundle = await bulkService.exportEventBundle(eventId, req.user);
    return success(res, bundle, 'Event data exported successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  importProjects,
  importJudges,
  exportEvent,
};
