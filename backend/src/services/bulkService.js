const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');

/**
 * Bulk import projects into an event.
 */
const bulkImportProjects = async (eventId, projectsList, currentUser) => {
  const parsedEventId = parseInt(eventId, 10);
  const event = await prisma.event.findUnique({ where: { id: parsedEventId } });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isOrganizer = currentUser?.isGlobalAdmin || event.organizerId === currentUser?.id;
  if (!isOrganizer) {
    const error = new Error('Forbidden. Only organizers can bulk import projects.');
    error.statusCode = 403;
    throw error;
  }

  if (!Array.isArray(projectsList) || projectsList.length === 0) {
    const error = new Error('Array of project objects is required.');
    error.statusCode = 400;
    throw error;
  }

  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const createdSubmissions = [];

  for (let idx = 0; idx < projectsList.length; idx++) {
    const p = projectsList[idx];
    const teamName = p.teamName || p.team || `Team ${p.title || idx + 1}`;
    const leaderEmail = p.leaderEmail || `lead_${Date.now()}_${idx}@example.org`;

    let leader = await prisma.user.findUnique({ where: { email: leaderEmail } });
    if (!leader) {
      leader = await prisma.user.create({
        data: {
          email: leaderEmail,
          name: p.leaderName || 'Team Leader',
          passwordHash: defaultPasswordHash,
        },
      });
    }

    let team = await prisma.team.findFirst({
      where: { eventId: parsedEventId, name: teamName },
    });

    if (!team) {
      team = await prisma.team.create({
        data: {
          eventId: parsedEventId,
          name: teamName,
          inviteCode: `BULK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          leaderId: leader.id,
          isRegistered: true,
        },
      });

      await prisma.teamMember.create({
        data: { teamId: team.id, userId: leader.id },
      });
    }

    let trackId = null;
    if (p.trackName || p.track) {
      const trackName = p.trackName || p.track;
      const track = await prisma.track.findFirst({
        where: { eventId: parsedEventId, name: { contains: trackName } },
      });
      if (track) trackId = track.id;
    }

    const submission = await prisma.submission.create({
      data: {
        eventId: parsedEventId,
        teamId: team.id,
        trackId,
        title: p.title || `Project ${idx + 1}`,
        tagline: p.tagline || p.summary || '',
        description: p.description || p.summary || 'Imported via bulk API.',
        repoUrl: p.repoUrl || p.repo_url || null,
        demoUrl: p.demoUrl || null,
        techStack: p.techStack || null,
        status: p.status || 'SUBMITTED',
      },
    });

    createdSubmissions.push(submission);
  }

  return {
    importedCount: createdSubmissions.length,
    submissions: createdSubmissions,
  };
};

/**
 * Bulk import judges into an event.
 */
const bulkImportJudges = async (eventId, judgesList, currentUser) => {
  const parsedEventId = parseInt(eventId, 10);
  const event = await prisma.event.findUnique({ where: { id: parsedEventId } });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isOrganizer = currentUser?.isGlobalAdmin || event.organizerId === currentUser?.id;
  if (!isOrganizer) {
    const error = new Error('Forbidden. Only organizers can bulk import judges.');
    error.statusCode = 403;
    throw error;
  }

  if (!Array.isArray(judgesList) || judgesList.length === 0) {
    const error = new Error('Array of judge objects is required.');
    error.statusCode = 400;
    throw error;
  }

  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const importedJudges = [];

  for (const j of judgesList) {
    const email = j.email?.trim().toLowerCase();
    if (!email) continue;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: j.name || 'Judge',
          passwordHash: defaultPasswordHash,
        },
      });
    }

    const existingMember = await prisma.eventMember.findUnique({
      where: { eventId_userId: { eventId: parsedEventId, userId: user.id } },
    });
    if (!existingMember) {
      await prisma.eventMember.create({
        data: { eventId: parsedEventId, userId: user.id, role: 'JUDGE' },
      });
    }

    let judgeRecord = await prisma.judge.findUnique({
      where: { eventId_userId: { eventId: parsedEventId, userId: user.id } },
    });
    if (!judgeRecord) {
      judgeRecord = await prisma.judge.create({
        data: { eventId: parsedEventId, userId: user.id, status: 'CONFIRMED' },
      });
    }

    importedJudges.push({ judgeId: judgeRecord.id, userId: user.id, email: user.email, name: user.name });
  }

  return {
    importedCount: importedJudges.length,
    judges: importedJudges,
  };
};

/**
 * Bulk export entire event data bundle in JSON format.
 */
const exportEventBundle = async (eventId, currentUser) => {
  const parsedEventId = parseInt(eventId, 10);
  const event = await prisma.event.findUnique({
    where: { id: parsedEventId },
    include: {
      criteria: true,
      tracks: true,
      judges: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          tracks: { include: { track: true } },
        },
      },
      submissions: {
        include: {
          team: { select: { id: true, name: true, leader: { select: { name: true, email: true } } } },
          track: true,
          scores: {
            include: {
              criterion: true,
              judge: { include: { user: { select: { name: true, email: true } } } },
            },
          },
          normalizedScores: true,
          communityVotes: true,
          comments: true,
        },
      },
    },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isOrganizer = currentUser?.isGlobalAdmin || event.organizerId === currentUser?.id;
  if (!isOrganizer) {
    const error = new Error('Forbidden. Only organizers can export full event data.');
    error.statusCode = 403;
    throw error;
  }

  return event;
};

module.exports = {
  bulkImportProjects,
  bulkImportJudges,
  exportEventBundle,
};
