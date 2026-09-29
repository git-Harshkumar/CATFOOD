const prisma = require('./prisma');

/**
 * Get a user's effective role for a specific event.
 * Returns: 'GLOBAL_ADMIN' | 'EVENT_OWNER' | 'CO_ORGANIZER' | 'JUDGE' | 'PARTICIPANT' | 'PUBLIC'
 */
const getUserEventRole = async (user, eventId) => {
  if (!user) return 'PUBLIC';
  if (user.isGlobalAdmin || user.role === 'ADMIN') return 'GLOBAL_ADMIN';

  const parsedEventId = parseInt(eventId, 10);
  if (isNaN(parsedEventId)) return 'PUBLIC';

  const event = await prisma.event.findUnique({
    where: { id: parsedEventId },
    select: { organizerId: true },
  });

  if (!event) return 'PUBLIC';
  if (event.organizerId === user.id) return 'EVENT_OWNER';

  const member = await prisma.eventMember.findUnique({
    where: {
      eventId_userId: {
        eventId: parsedEventId,
        userId: user.id,
      },
    },
  });

  if (member) {
    if (member.role === 'ORGANIZER') return 'CO_ORGANIZER';
    if (member.role === 'JUDGE') return 'JUDGE';
    if (member.role === 'PARTICIPANT') return 'PARTICIPANT';
  }

  return 'PUBLIC';
};

/**
 * Check if a user can manage a specific event (Owner, Co-Organizer, or Global Admin).
 */
const canManageEvent = async (user, eventId) => {
  const role = await getUserEventRole(user, eventId);
  return role === 'GLOBAL_ADMIN' || role === 'EVENT_OWNER' || role === 'CO_ORGANIZER';
};

/**
 * Check if a user can view an event (Public events, or participants/organizers if draft/private).
 */
const canViewEvent = async (user, eventId) => {
  const parsedEventId = parseInt(eventId, 10);
  if (isNaN(parsedEventId)) return false;

  const event = await prisma.event.findUnique({
    where: { id: parsedEventId },
    select: { status: true },
  });

  if (!event) return false;
  if (event.status === 'PUBLISHED' || event.status === 'ACTIVE') return true;

  return canManageEvent(user, eventId);
};

const canManageJudges = async (user, eventId) => canManageEvent(user, eventId);
const canManageCertificates = async (user, eventId) => canManageEvent(user, eventId);
const canManageWebhooks = async (user, eventId) => canManageEvent(user, eventId);
const canImportExport = async (user, eventId) => canManageEvent(user, eventId);

module.exports = {
  getUserEventRole,
  canManageEvent,
  canViewEvent,
  canManageJudges,
  canManageCertificates,
  canManageWebhooks,
  canImportExport,
};
