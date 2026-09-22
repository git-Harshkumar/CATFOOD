const prisma = require('../utils/prisma');

/**
 * Log an auditable event in the platform.
 * 
 * @param {Object} params
 * @param {number|null} params.actorId - ID of user performing action
 * @param {string} params.action - Action identifier e.g. "JUDGE_INVITED", "SCORE_SUBMITTED", "NORMALIZATION_EXECUTED"
 * @param {string|null} params.targetType - Target entity type e.g. "Judge", "Submission", "Score"
 * @param {string|number|null} params.targetId - ID of target entity
 * @param {Object|null} params.metadata - Extra context for action
 * @returns {Promise<Object>} Created audit log entry
 */
const logAction = async ({ actorId = null, action, targetType = null, targetId = null, metadata = null }) => {
  try {
    const entry = await prisma.auditLog.create({
      data: {
        actorId: actorId ? parseInt(actorId, 10) : null,
        action,
        targetType: targetType ? String(targetType) : null,
        targetId: targetId ? String(targetId) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        timestamp: new Date(),
      },
    });
    return entry;
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err);
    // Do not crash the parent operation if logging fails
    return null;
  }
};

/**
 * Retrieve audit logs, optionally filtered by action or targetType.
 * 
 * @param {Object} filters
 * @param {number} [filters.limit=100]
 * @param {string} [filters.action]
 * @param {string} [filters.targetType]
 * @returns {Promise<Array>}
 */
const getAuditLogs = async (filters = {}) => {
  const where = {};
  if (filters.action) where.action = filters.action;
  if (filters.targetType) where.targetType = filters.targetType;
  if (filters.actorId) where.actorId = parseInt(filters.actorId, 10);

  return prisma.auditLog.findMany({
    where,
    include: {
      actor: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: filters.limit ? parseInt(filters.limit, 10) : 100,
  });
};

module.exports = {
  logAction,
  getAuditLogs,
};
