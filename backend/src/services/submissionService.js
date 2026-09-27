const prisma = require('../utils/prisma');

const createOrUpdateSubmission = async (userId, currentUser, teamId, data) => {
  const team = await prisma.team.findUnique({
    where: { id: parseInt(teamId, 10) },
    include: {
      event: true,
      members: true,
      submission: true,
    },
  });

  if (!team) {
    const error = new Error('Team not found.');
    error.statusCode = 404;
    throw error;
  }

  let eventRole = null;
  if (currentUser && !currentUser.isGlobalAdmin) {
    const member = await prisma.eventMember.findUnique({
      where: { eventId_userId: { eventId: team.eventId, userId: currentUser.id } }
    });
    if (member) eventRole = member.role;
  }

  const isMember = team.members.some((m) => m.userId === userId);
  const isOrganizer = currentUser?.isGlobalAdmin || eventRole === 'ORGANIZER' || team.event.organizerId === userId;

  if (!isMember && !isOrganizer) {
    const error = new Error('Unauthorized. You can only submit or edit projects for your own team.');
    error.statusCode = 403;
    throw error;
  }

  const now = new Date();
  const deadline = new Date(team.event.deadline);

  if (now > deadline && !isOrganizer) {
    const error = new Error(
      `Submission deadline has passed on ${deadline.toISOString()}. Modifications are strictly prohibited.`
    );
    error.statusCode = 403;
    throw error;
  }

  if (team.event.status === 'COMPLETED' && !isOrganizer) {
    const error = new Error('This hackathon has already concluded. Submissions are closed.');
    error.statusCode = 400;
    throw error;
  }

  const { title, tagline, description, repoUrl, demoUrl, videoUrl, techStack } = data;

  const submissionData = {
    title: title.trim(),
    tagline: tagline ? tagline.trim() : null,
    description: description.trim(),
    repoUrl: repoUrl ? repoUrl.trim() : null,
    demoUrl: demoUrl ? demoUrl.trim() : null,
    videoUrl: videoUrl ? videoUrl.trim() : null,
    techStack: Array.isArray(techStack) ? techStack.join(', ') : techStack || null,
  };

  if (team.submission) {
    return prisma.submission.update({
      where: { id: team.submission.id },
      data: submissionData,
      include: {
        team: {
          select: { id: true, name: true, leaderId: true },
        },
        event: {
          select: { id: true, title: true, deadline: true },
        },
      },
    });
  } else {
    return prisma.submission.create({
      data: {
        ...submissionData,
        teamId: team.id,
        eventId: team.eventId,
      },
      include: {
        team: {
          select: { id: true, name: true, leaderId: true },
        },
        event: {
          select: { id: true, title: true, deadline: true },
        },
      },
    });
  }
};

const getSubmissionById = async (submissionId, currentUser) => {
  const submission = await prisma.submission.findUnique({
    where: { id: parseInt(submissionId, 10) },
    include: {
      team: {
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      event: {
        include: {
          criteria: true,
        },
      },
      scores: {
        include: {
          judge: { include: { user: { select: { id: true, name: true } } } },
          criterion: { select: { id: true, name: true, maxScore: true, weight: true } },
        },
      },
    },
  });

  if (!submission) {
    const error = new Error('Submission not found.');
    error.statusCode = 404;
    throw error;
  }

  let eventRole = null;
  if (currentUser && !currentUser.isGlobalAdmin) {
    const member = await prisma.eventMember.findUnique({
      where: { eventId_userId: { eventId: submission.eventId, userId: currentUser.id } }
    });
    if (member) eventRole = member.role;
  }

  const isOrganizer = currentUser?.isGlobalAdmin || eventRole === 'ORGANIZER' || submission.event.organizerId === currentUser?.id;
  const isJudge = eventRole === 'JUDGE';
  const isPublished = submission.event.isLeaderboardPublished;

  if (!isOrganizer && !isJudge && !isPublished) {
    const safeSubmission = { ...submission };
    delete safeSubmission.scores;
    return safeSubmission;
  }

  return submission;
};

const getSubmissionsByEvent = async (eventId, currentUser) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const submissions = await prisma.submission.findMany({
    where: { eventId: parseInt(eventId, 10) },
    include: {
      team: {
        select: { id: true, name: true, leaderId: true },
      },
      scores: {
        include: {
          criterion: true,
        },
      },
      _count: {
        select: { scores: true },
      },
    },
    orderBy: { submittedAt: 'asc' },
  });

  let eventRole = null;
  if (currentUser && !currentUser.isGlobalAdmin) {
    const member = await prisma.eventMember.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: currentUser.id } }
    });
    if (member) eventRole = member.role;
  }

  const isOrganizer = currentUser?.isGlobalAdmin || eventRole === 'ORGANIZER' || event.organizerId === currentUser?.id;
  const isJudge = eventRole === 'JUDGE';
  const isPublished = event.isLeaderboardPublished;

  if (!isOrganizer && !isJudge && !isPublished) {
    return submissions.map((sub) => {
      const copy = { ...sub };
      delete copy.scores;
      return copy;
    });
  }

  return submissions;
};

module.exports = {
  createOrUpdateSubmission,
  getSubmissionById,
  getSubmissionsByEvent,
};
