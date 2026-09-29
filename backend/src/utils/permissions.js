const prisma = require('./prisma');

/**
 * Check if a user can manage a specific event (Organizer, Co-organizer in EventMember, or Global Admin).
 * @param {Object} user 
 * @param {number|string} eventId 
 * @returns {Promise<boolean>}
 */
const canManageEvent = async (user, eventId) => {
  if (!user) return false;
  if (user.isGlobalAdmin || user.role === 'ADMIN') return true;

  const parsedEventId = parseInt(eventId, 10);
  if (isNaN(parsedEventId)) return false;

  const event = await prisma.event.findUnique({
    where: { id: parsedEventId },
    select: { organizerId: true },
  });

  if (!event) return false;
  if (event.organizerId === user.id) return true;

  // Check co-organizer in EventMember
  const member = await prisma.eventMember.findUnique({
    where: {
      eventId_userId: {
        eventId: parsedEventId,
        userId: user.id,
      },
    },
  });

  return Boolean(member && member.role === 'ORGANIZER');
};

module.exports = {
  canManageEvent,
};
