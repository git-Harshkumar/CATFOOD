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
          user: {
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
            create: [
              { name: 'Innovation & Originality', description: 'Uniqueness and creativity of idea', maxScore: 10, weight: 1.0 },
              { name: 'Technical Execution', description: 'Architecture, code quality and technical complexity', maxScore: 10, weight: 1.0 },
              { name: 'UI & UX Design', description: 'Visual aesthetic, responsiveness and user experience', maxScore: 10, weight: 0.8 },
              { name: 'Practical Impact & Utility', description: 'Real-world usefulness and problem-solving capability', maxScore: 10, weight: 1.2 },
            ],
          },
      members: {
        create: [
          {
            userId: organizerId,
            role: 'ORGANIZER',
          }
        ]
      }
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
  delete updatePayload.criteria;

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

const addPrize = async (eventId, organizerId, prizeData) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.organizerId !== organizerId) {
    const error = new Error('Unauthorized. You can only manage prizes for your own events.');
    error.statusCode = 403;
    throw error;
  }

  return prisma.prize.create({
    data: {
      eventId: event.id,
      name: prizeData.name,
      description: prizeData.description || null,
      value: prizeData.value || null,
    },
  });
};

const addEventQuestion = async (eventId, organizerId, questionData) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.organizerId !== organizerId) {
    const error = new Error('Unauthorized. You can only manage questions for your own events.');
    error.statusCode = 403;
    throw error;
  }

  return prisma.eventQuestion.create({
    data: {
      eventId: event.id,
      question: questionData.question,
      isRequired: questionData.isRequired || false,
      order: parseInt(questionData.order, 10) || 0,
    },
  });
};

const auditService = require('./auditService');

const assignJudge = async (eventId, organizerId, judgeEmail, trackIds = []) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
    include: { tracks: true },
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

  const judgeUser = await prisma.user.findUnique({
    where: { email: judgeEmail.toLowerCase() },
  });

  if (!judgeUser) {
    const error = new Error('User with this email not found.');
    error.statusCode = 404;
    throw error;
  }

  // Use a transaction to ensure both records are created together
  const [judge, member] = await prisma.$transaction([
    prisma.judge.upsert({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId: judgeUser.id,
        },
      },
      update: {},
      create: {
        eventId: event.id,
        userId: judgeUser.id,
        status: 'INVITED',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.eventMember.upsert({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId: judgeUser.id,
        },
      },
      update: {
        role: 'JUDGE',
      },
      create: {
        eventId: event.id,
        userId: judgeUser.id,
        role: 'JUDGE',
      },
    }),
  ]);

  // Handle track assignments if trackIds provided
  if (Array.isArray(trackIds) && trackIds.length > 0) {
    for (const tId of trackIds) {
      const parsedTrackId = parseInt(tId, 10);
      const trackExists = event.tracks.some((t) => t.id === parsedTrackId);
      if (trackExists) {
        await prisma.judgeTrack.upsert({
          where: { judgeId_trackId: { judgeId: judge.id, trackId: parsedTrackId } },
          update: {},
          create: { judgeId: judge.id, trackId: parsedTrackId },
        });
      }
    }
  }

  await auditService.logAction({
    actorId: organizerId,
    action: 'JUDGE_INVITED',
    targetType: 'Judge',
    targetId: judge.id,
    metadata: {
      eventId: event.id,
      judgeEmail: judgeUser.email,
      trackIds,
    },
  });

  return prisma.judge.findUnique({
    where: { id: judge.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      tracks: { include: { track: true } },
    },
  });
};

const getEventJudges = async (eventId, organizerId) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  return prisma.judge.findMany({
    where: { eventId: event.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      tracks: { include: { track: true } },
      assignments: {
        include: {
          submission: { select: { id: true, title: true, trackId: true } },
        },
      },
      scores: { select: { id: true, submissionId: true } },
    },
  });
};

const updateJudgeStatus = async (eventId, userId, status) => {
  const allowedStatuses = ['INVITED', 'ACCEPTED', 'DECLINED'];
  if (!allowedStatuses.includes(status)) {
    const error = new Error(`Invalid judge status. Allowed: ${allowedStatuses.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const judge = await prisma.judge.findUnique({
    where: {
      eventId_userId: {
        eventId: parseInt(eventId, 10),
        userId: parseInt(userId, 10),
      },
    },
  });

  if (!judge) {
    const error = new Error('Judge record not found for this event.');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.judge.update({
    where: { id: judge.id },
    data: { status },
  });

  await auditService.logAction({
    actorId: userId,
    action: 'JUDGE_STATUS_UPDATED',
    targetType: 'Judge',
    targetId: judge.id,
    metadata: { eventId: parseInt(eventId, 10), status },
  });

  return updated;
};

const batchAssignJudges = async (eventId, organizerId, { judgeIds, submissionIds, batchName = null }) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.organizerId !== organizerId) {
    const error = new Error('Unauthorized. Only organizer can assign judges.');
    error.statusCode = 403;
    throw error;
  }

  if (!Array.isArray(judgeIds) || !Array.isArray(submissionIds) || judgeIds.length === 0 || submissionIds.length === 0) {
    const error = new Error('judgeIds and submissionIds must be non-empty arrays.');
    error.statusCode = 400;
    throw error;
  }

  const batch = batchName || `batch_${Date.now()}`;
  const judges = await prisma.judge.findMany({
    where: { id: { in: judgeIds.map((id) => parseInt(id, 10)) }, eventId: event.id },
    include: { tracks: true },
  });

  const submissions = await prisma.submission.findMany({
    where: { id: { in: submissionIds.map((id) => parseInt(id, 10)) }, eventId: event.id },
  });

  const assignmentsCreated = [];
  const skipped = [];

  for (const judge of judges) {
    const judgeTrackIds = judge.tracks.map((jt) => jt.trackId);

    for (const sub of submissions) {
      // Check track constraint if judge has track restrictions
      if (judgeTrackIds.length > 0 && sub.trackId && !judgeTrackIds.includes(sub.trackId)) {
        skipped.push({
          judgeId: judge.id,
          submissionId: sub.id,
          reason: 'TRACK_MISMATCH',
        });
        continue;
      }

      try {
        const assignment = await prisma.judgeAssignment.upsert({
          where: {
            judgeId_submissionId: {
              judgeId: judge.id,
              submissionId: sub.id,
            },
          },
          update: {
            trackId: sub.trackId || null,
            batch,
          },
          create: {
            judgeId: judge.id,
            submissionId: sub.id,
            trackId: sub.trackId || null,
            batch,
            status: 'PENDING',
          },
        });
        assignmentsCreated.push(assignment);
      } catch (e) {
        skipped.push({ judgeId: judge.id, submissionId: sub.id, reason: e.message });
      }
    }
  }

  await auditService.logAction({
    actorId: organizerId,
    action: 'JUDGE_BATCH_ASSIGNED',
    targetType: 'Event',
    targetId: event.id,
    metadata: {
      batch,
      assignedCount: assignmentsCreated.length,
      skippedCount: skipped.length,
    },
  });

  return {
    batch,
    assignedCount: assignmentsCreated.length,
    assignments: assignmentsCreated,
    skipped,
  };
};

const autoAssignJudges = async (eventId, organizerId, { judgesPerProject = 2, batchName = null } = {}) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.organizerId !== organizerId) {
    const error = new Error('Unauthorized. Only organizer can run auto-assignment.');
    error.statusCode = 403;
    throw error;
  }

  const batch = batchName || `auto_${Date.now()}`;

  const judges = await prisma.judge.findMany({
    where: { eventId: event.id },
    include: {
      tracks: true,
      assignments: true,
    },
  });

  if (judges.length === 0) {
    const error = new Error('No judges available for assignment in this event.');
    error.statusCode = 400;
    throw error;
  }

  const submissions = await prisma.submission.findMany({
    where: { eventId: event.id },
    include: { assignments: true },
  });

  if (submissions.length === 0) {
    const error = new Error('No submitted projects found to assign.');
    error.statusCode = 400;
    throw error;
  }

  // Workload tracking map: judgeId -> count of assignments
  const workloadMap = new Map();
  judges.forEach((j) => {
    workloadMap.set(j.id, j.assignments.length);
  });

  const assignmentsCreated = [];

  for (const sub of submissions) {
    // Current assigned judges for this sub
    const existingJudgeIds = new Set(sub.assignments.map((a) => a.judgeId));

    // Find eligible judges respecting track isolation
    const eligibleJudges = judges.filter((j) => {
      if (existingJudgeIds.has(j.id)) return false;
      const judgeTrackIds = j.tracks.map((jt) => jt.trackId);
      if (judgeTrackIds.length > 0 && sub.trackId && !judgeTrackIds.includes(sub.trackId)) {
        return false;
      }
      return true;
    });

    // Sort by current workload (ascending)
    eligibleJudges.sort((a, b) => (workloadMap.get(a.id) || 0) - (workloadMap.get(b.id) || 0));

    const needed = Math.max(0, judgesPerProject - existingJudgeIds.size);
    const toAssign = eligibleJudges.slice(0, needed);

    for (const judge of toAssign) {
      try {
        const assignment = await prisma.judgeAssignment.create({
          data: {
            judgeId: judge.id,
            submissionId: sub.id,
            trackId: sub.trackId || null,
            batch,
            status: 'PENDING',
          },
        });
        assignmentsCreated.push(assignment);
        workloadMap.set(judge.id, (workloadMap.get(judge.id) || 0) + 1);
      } catch (err) {
        // If race or duplicate, ignore
      }
    }
  }

  await auditService.logAction({
    actorId: organizerId,
    action: 'JUDGE_ALGORITHMIC_ASSIGNED',
    targetType: 'Event',
    targetId: event.id,
    metadata: {
      batch,
      judgesPerProject,
      assignedCount: assignmentsCreated.length,
      totalSubmissions: submissions.length,
    },
  });

  return {
    batch,
    assignedCount: assignmentsCreated.length,
    totalSubmissions: submissions.length,
    workloads: Object.fromEntries(workloadMap),
  };
};

const getJudgeAssignments = async (eventId, organizerId) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  return prisma.judgeAssignment.findMany({
    where: { submission: { eventId: event.id } },
    include: {
      judge: { include: { user: { select: { id: true, name: true, email: true } } } },
      submission: {
        include: {
          team: { select: { id: true, name: true } },
          track: true,
        },
      },
      track: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

const removeJudgeAssignment = async (eventId, organizerId, assignmentId) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.organizerId !== organizerId) {
    const error = new Error('Unauthorized. Only organizer can remove assignments.');
    error.statusCode = 403;
    throw error;
  }

  const assignment = await prisma.judgeAssignment.findUnique({
    where: { id: parseInt(assignmentId, 10) },
  });

  if (!assignment) {
    const error = new Error('Assignment not found.');
    error.statusCode = 404;
    throw error;
  }

  await prisma.judgeAssignment.delete({
    where: { id: assignment.id },
  });

  await auditService.logAction({
    actorId: organizerId,
    action: 'JUDGE_ASSIGNMENT_REMOVED',
    targetType: 'JudgeAssignment',
    targetId: assignment.id,
    metadata: { eventId: event.id },
  });

  return { message: 'Assignment removed successfully' };
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

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: {
      isLeaderboardPublished: publishState,
      status: publishState ? 'COMPLETED' : event.status,
    },
  });

  await auditService.logAction({
    actorId: organizerId,
    action: 'LEADERBOARD_PUBLISHED',
    targetType: 'Event',
    targetId: event.id,
    metadata: { isLeaderboardPublished: publishState },
  });

  return updated;
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  addCriterion,
  addPrize,
  addEventQuestion,
  assignJudge,
  getEventJudges,
  updateJudgeStatus,
  batchAssignJudges,
  autoAssignJudges,
  getJudgeAssignments,
  removeJudgeAssignment,
  publishLeaderboard,
};

