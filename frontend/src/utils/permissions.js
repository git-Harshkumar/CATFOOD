/**
 * Centralized role-based permissions utility for the frontend.
 * Reflects the backend RBAC authorization model accurately.
 */

/**
 * Check if the user has any of the specified roles.
 * Admins (isGlobalAdmin or role === 'ADMIN') automatically pass all role checks.
 */
export const hasRole = (user, ...allowedRoles) => {
  if (!user) return false;
  if (user.isGlobalAdmin || user.role === 'ADMIN') return true;
  const flatRoles = allowedRoles.flat();
  if (flatRoles.length === 0) return true;
  return flatRoles.includes(user.role);
};

/**
 * Check if user can create a hackathon event.
 * Backend requires ORGANIZER or ADMIN.
 */
export const canCreateEvent = (user) => {
  return hasRole(user, 'ORGANIZER');
};

/**
 * Check if user is the organizer of a specific event (or global admin).
 */
export const isEventOrganizer = (user, eventOrId) => {
  if (!user) return false;
  if (user.isGlobalAdmin || user.role === 'ADMIN') return true;

  const eventId = typeof eventOrId === 'object' && eventOrId !== null
    ? eventOrId.id
    : Number(eventOrId);

  // Check event object organizerId
  if (typeof eventOrId === 'object' && eventOrId !== null && eventOrId.organizerId) {
    if (eventOrId.organizerId === user.id) return true;
  }

  // Check user's organizedEvents list
  if (Array.isArray(user.organizedEvents)) {
    if (user.organizedEvents.some((ev) => ev.id === eventId)) {
      return true;
    }
  }

  return false;
};

/**
 * Check if user is a designated judge for a specific event (or global admin).
 */
export const isEventJudge = (user, eventOrId) => {
  if (!user) return false;
  if (user.isGlobalAdmin || user.role === 'ADMIN') return true;

  const eventId = typeof eventOrId === 'object' && eventOrId !== null
    ? eventOrId.id
    : Number(eventOrId);

  // Check event object judges list
  if (typeof eventOrId === 'object' && eventOrId !== null && Array.isArray(eventOrId.judges)) {
    if (eventOrId.judges.some((j) => j.userId === user.id || j.user?.id === user.id)) {
      return true;
    }
  }

  // Check user's judgeProfiles list
  if (Array.isArray(user.judgeProfiles)) {
    if (user.judgeProfiles.some((jp) => jp.eventId === eventId || jp.event?.id === eventId)) {
      return true;
    }
  }

  return false;
};

/**
 * Check if user can score submissions in general (Judge or Admin).
 */
export const canScore = (user) => {
  return hasRole(user, 'JUDGE');
};

/**
 * Check if user can access the Organizer Portal.
 */
export const canAccessOrganizerPortal = (user) => {
  return hasRole(user, 'ORGANIZER');
};

/**
 * Check if user can access the Judge Portal.
 */
export const canAccessJudgePortal = (user) => {
  return hasRole(user, 'JUDGE');
};

/**
 * Check if user can participate in hackathons.
 */
export const canParticipate = (user) => {
  if (!user) return false;
  // Participants, or any user that has teams
  return user.role === 'PARTICIPANT' || user.isGlobalAdmin || user.role === 'ADMIN' || (user.teamMemberships && user.teamMemberships.length > 0);
};

export default {
  hasRole,
  canCreateEvent,
  isEventOrganizer,
  isEventJudge,
  canScore,
  canAccessOrganizerPortal,
  canAccessJudgePortal,
  canParticipate,
};
