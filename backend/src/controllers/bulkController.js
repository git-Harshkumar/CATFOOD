const bulkService = require('../services/bulkService');
const { success } = require('../utils/response');

const previewImport = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { items, type } = req.body;
    const preview = await bulkService.previewBulkImport(eventId, items || req.body, type || 'projects', req.user);
    return success(res, preview, 'Import preview generated');
  } catch (err) {
    next(err);
  }
};

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
    const anonymizeJudges = req.query.anonymizeJudges === 'true' || req.query.blind === 'true';
    const bundle = await bulkService.exportEventBundle(eventId, req.user, { anonymizeJudges });
    return success(res, bundle, 'Event data exported successfully');
  } catch (err) {
    next(err);
  }
};

const importEventBundle = async (req, res, next) => {
  try {
    const bundle = req.body.bundle || req.body;
    const result = await bulkService.importEventBundle(bundle, req.user);
    return success(res, result, 'Event bundle restored successfully', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  previewImport,
  importProjects,
  importJudges,
  exportEvent,
  importEventBundle,
};
