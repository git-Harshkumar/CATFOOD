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

    const eventIdParam = req.params.eventId || req.params.id || req.body.eventId || req.query.eventId;
    
    if (!eventIdParam) {
      return error(res, 'Event context missing for role verification.', 400);
    }

    const eventId = parseInt(eventIdParam, 10);
    if (isNaN(eventId)) {
      return error(res, 'Invalid event ID.', 400);
    }

    const flatRoles = allowedRoles.flat();

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
