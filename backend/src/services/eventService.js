const prisma = require('../utils/prisma');

const getAllEvents = async () => {
  return prisma.event.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      organizer: {
        select: { id: true, name: true, email: true },
      },
      criteria: true,
      _count: {
        select: { teams: true, submissions: true, judges: true },
      },
    },
  });
};

const getEventById = async (id) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      organizer: {
        select: { id: true, name: true, email: true },
      },
      criteria: true,
      judges: {
        include: {
          judge: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      teams: {
        include: {
          leader: { select: { id: true, name: true } },
          members: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          submission: {
            select: { id: true, title: true, submittedAt: true },
          },
        },
      },
      _count: {
        select: { teams: true, submissions: true, judges: true },
      },
    },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  return event;
};

const createEvent = async (organizerId, data) => {
  const {
    title,
    tagline,
    description,
    rules,
    minTeamSize = 1,
    maxTeamSize = 4,
    startDate,
    deadline,
    judgingDeadline,
    status = 'ACTIVE',
    criteria = [],
  } = data;

  const event = await prisma.event.create({
    data: {
      title,
      tagline,
      description,
      rules,
      minTeamSize: parseInt(minTeamSize, 10),
      maxTeamSize: parseInt(maxTeamSize, 10),
      startDate: new Date(startDate),
      deadline: new Date(deadline),
      judgingDeadline: judgingDeadline ? new Date(judgingDeadline) : null,
      status,
      organizerId,
      criteria: criteria.length > 0
        ? {
            create: criteria.map((c) => ({
              name: c.name,
              description: c.description || null,
              maxScore: parseInt(c.maxScore, 10) || 10,
              weight: parseFloat(c.weight) || 1.0,
            })),
          }
        : {
            // Default hackathon criteria if none specified
            create: [
              { name: 'Innovation & Originality', description: 'Uniqueness and creativity of idea', maxScore: 10, weight: 1.0 },
              { name: 'Technical Execution', description: 'Architecture, code quality and technical complexity', maxScore: 10, weight: 1.0 },
              { name: 'UI & UX Design', description: 'Visual aesthetic, responsiveness and user experience', maxScore: 10, weight: 0.8 },
              { name: 'Practical Impact & Utility', description: 'Real-world usefulness and problem-solving capability', maxScore: 10, weight: 1.2 },
            ],
          },
    },
    include: {
      criteria: true,
      organizer: { select: { id: true, name: true, email: true } },
    },
  });

  return event;
};

const updateEvent = async (eventId, organizerId, data) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.organizerId !== organizerId) {
    const error = new Error('Unauthorized. You can only update events you organized.');
    error.statusCode = 403;
    throw error;
  }

  const updatePayload = { ...data };
  if (updatePayload.startDate) updatePayload.startDate = new Date(updatePayload.startDate);
  if (updatePayload.deadline) updatePayload.deadline = new Date(updatePayload.deadline);
  if (updatePayload.judgingDeadline) updatePayload.judgingDeadline = new Date(updatePayload.judgingDeadline);
  if (updatePayload.minTeamSize) updatePayload.minTeamSize = parseInt(updatePayload.minTeamSize, 10);
  if (updatePayload.maxTeamSize) updatePayload.maxTeamSize = parseInt(updatePayload.maxTeamSize, 10);
  delete updatePayload.criteria; // Managed separately

  return prisma.event.update({
    where: { id: parseInt(eventId, 10) },
    data: updatePayload,
    include: {
      criteria: true,
      organizer: { select: { id: true, name: true, email: true } },
    },
  });
};

const addCriterion = async (eventId, organizerId, criterionData) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.organizerId !== organizerId) {
    const error = new Error('Unauthorized. You can only manage criteria for your own events.');
    error.statusCode = 403;
    throw error;
  }

  return prisma.criterion.create({
    data: {
      eventId: event.id,
      name: criterionData.name,
      description: criterionData.description || null,
      maxScore: parseInt(criterionData.maxScore, 10) || 10,
      weight: parseFloat(criterionData.weight) || 1.0,
    },
  });
};

const assignJudge = async (eventId, organizerId, judgeEmail) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.organizerId !== organizerId) {
    const error = new Error('Unauthorized. You can only assign judges to your own events.');
    error.statusCode = 403;
    throw error;
  }

  const judge = await prisma.user.findUnique({
    where: { email: judgeEmail.toLowerCase() },
  });

  if (!judge) {
    const error = new Error('User with this email not found.');
    error.statusCode = 404;
    throw error;
  }

  if (judge.role !== 'JUDGE' && judge.role !== 'ORGANIZER') {
    const error = new Error(`User has role '${judge.role}'. Must have role 'JUDGE' to be assigned as judge.`);
    error.statusCode = 400;
    throw error;
  }

  return prisma.judgeAssignment.upsert({
    where: {
      eventId_judgeId: {
        eventId: event.id,
        judgeId: judge.id,
      },
    },
    update: {},
    create: {
      eventId: event.id,
      judgeId: judge.id,
    },
    include: {
      judge: { select: { id: true, name: true, email: true } },
    },
  });
};

const publishLeaderboard = async (eventId, organizerId, publishState = true) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.organizerId !== organizerId) {
    const error = new Error('Unauthorized. Only event organizer can publish leaderboard.');
    error.statusCode = 403;
    throw error;
  }

  return prisma.event.update({
    where: { id: event.id },
    data: {
      isLeaderboardPublished: publishState,
      status: publishState ? 'COMPLETED' : event.status,
    },
  });
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  addCriterion,
  assignJudge,
  publishLeaderboard,
};
