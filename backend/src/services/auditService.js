const prisma = require('../utils/prisma');

/**
 * Log an auditable event in the platform.
 * 
 * @param {Object} params
 * @param {number|null} [params.eventId] - Event ID scope
 * @param {number|null} [params.actorId] - ID of user performing action
 * @param {string} params.action - Action identifier e.g. "COMMUNITY_VOTE_CAST", "COMMUNITY_VOTE_DUPLICATE_REJECTED"
 * @param {string|null} [params.targetType] - Target entity type e.g. "Submission", "Score"
 * @param {string|number|null} [params.targetId] - ID of target entity
 * @param {Object|string|null} [params.metadata] - Extra context for action
 * @returns {Promise<Object>} Created audit log entry
 */
const logAction = async ({ eventId = null, actorId = null, action, targetType = null, targetId = null, metadata = null }) => {
  try {
    const parsedEventId = eventId || 
      (metadata && typeof metadata === 'object' ? metadata.eventId : null) ||
      (targetType === 'Event' && targetId ? targetId : null);
    const entry = await prisma.auditLog.create({
      data: {
        eventId: parsedEventId ? parseInt(parsedEventId, 10) : null,
        actorId: actorId ? parseInt(actorId, 10) : null,
        action,
        targetType: targetType ? String(targetType) : null,
        targetId: targetId ? String(targetId) : null,
        metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
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
 * Retrieve audit logs strictly filtered by event, action, or targetType.
 * 
 * @param {Object} filters
 * @param {number} [filters.eventId]
 * @param {number} [filters.limit=100]
 * @param {string} [filters.action]
 * @param {string} [filters.targetType]
 * @param {number} [filters.actorId]
 * @returns {Promise<Array>}
 */
const getAuditLogs = async (filters = {}) => {
  const where = {};
  if (filters.eventId !== undefined && filters.eventId !== null) {
    where.eventId = parseInt(filters.eventId, 10);
  }
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
