const { error } = require('../utils/response');
const prisma = require('../utils/prisma');

const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required.', 401);
    }

    if (req.user.isGlobalAdmin) {
      return next();
    }

    const flatRoles = allowedRoles.flat();
    let eventIdParam = req.params.eventId || req.params.id || req.body.eventId || req.query.eventId;

    if (!eventIdParam && req.params.submissionId) {
      const sub = await prisma.submission.findUnique({
        where: { id: parseInt(req.params.submissionId, 10) },
        select: { eventId: true },
      });
      if (sub) {
        eventIdParam = sub.eventId;
      }
    }
    
    if (!eventIdParam) {
      if (req.user.role && flatRoles.includes(req.user.role)) {
        return next();
      }
      if (flatRoles.includes('ORGANIZER')) {
        const organized = await prisma.event.findFirst({ where: { organizerId: req.user.id } });
        if (organized) return next();
      }
      if (flatRoles.includes('JUDGE')) {
        const judgeProfile = await prisma.judge.findFirst({ where: { userId: req.user.id } });
        if (judgeProfile) return next();
      }
      return error(
        res,
        `Access denied. Requires one of the following roles: [${flatRoles.join(', ')}]. Current role: '${req.user.role || 'NONE'}'`,
        403
      );
    }

    const eventId = parseInt(eventIdParam, 10);
    if (isNaN(eventId)) {
      return error(res, 'Invalid event ID.', 400);
    }

    try {
      const eventMember = await prisma.eventMember.findUnique({
        where: {
          eventId_userId: {
            eventId: eventId,
            userId: req.user.id,
          },
        },
      });

      if (!eventMember || !flatRoles.includes(eventMember.role)) {
        // Fallback: Check if user is organizer of event
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (event && event.organizerId === req.user.id && flatRoles.includes('ORGANIZER')) {
          req.eventRole = 'ORGANIZER';
          return next();
        }
        return error(
          res,
          `Access denied. Requires one of the following roles in this event: [${flatRoles.join(', ')}].`,
          403
        );
      }

      // Attach the resolved event role for downstream use
      req.eventRole = eventMember.role;
      next();
    } catch (err) {
      console.error('Role verification error:', err);
      return error(res, 'Failed to verify user role.', 500);
    }
  };
};

module.exports = {
  requireRole,
};
