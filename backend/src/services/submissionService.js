const prisma = require('../utils/prisma');

const createOrUpdateSubmission = async (userId, userRole, teamId, data) => {
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

  // Authorization check: User must be a member of the team (or organizer override)
  const isMember = team.members.some((m) => m.userId === userId);
  const isOrganizer = userRole === 'ORGANIZER' && team.event.organizerId === userId;

  if (!isMember && !isOrganizer) {
    const error = new Error('Unauthorized. You can only submit or edit projects for your own team.');
    error.statusCode = 403;
    throw error;
  }

  // Deadline check: STRICT SERVER-SIDE ENFORCEMENT
  const now = new Date();
  const deadline = new Date(team.event.deadline);

  if (now > deadline && !isOrganizer) {
    const error = new Error(
      `Submission deadline has passed on ${deadline.toISOString()}. Modifications are strictly prohibited.`
    );
    error.statusCode = 403;
    throw error;
  }

  // Event status check
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
    // Update existing submission
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
    // Create new submission
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
          judge: { select: { id: true, name: true } },
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

  // RBAC privacy for scores:
  // If user is neither an ORGANIZER nor a JUDGE, and leaderboard is not published,
  // hide individual judge scores and feedback from competitors!
  const isOrganizer = currentUser?.role === 'ORGANIZER' && submission.event.organizerId === currentUser.id;
  const isJudge = currentUser?.role === 'JUDGE';
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

  const isOrganizer = currentUser?.role === 'ORGANIZER' && event.organizerId === currentUser.id;
  const isJudge = currentUser?.role === 'JUDGE';
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
