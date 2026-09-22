const prisma = require('../utils/prisma');

const createOrUpdateSubmission = async (userId, currentUser, teamId, data) => {
  const team = await prisma.team.findUnique({
    where: { id: parseInt(teamId, 10) },
    include: {
      event: { include: { questions: true } },
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

  const { title, tagline, description, repoUrl, demoUrl, videoUrl, techStack, status, thumbnailUrl, imageGallery, trackId, answers } = data;

  // Enforce required questions if status is SUBMITTED
  if (status === 'SUBMITTED') {
    const requiredQuestions = team.event.questions.filter(q => q.isRequired);
    for (const q of requiredQuestions) {
      const found = (answers || []).find(a => parseInt(a.questionId, 10) === q.id);
      if (!found || !found.answer || found.answer.trim() === '') {
        const error = new Error(`Required question is missing: ${q.question}`);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  const submissionData = {
    title: title.trim(),
    tagline: tagline ? tagline.trim() : null,
    description: description.trim(),
    repoUrl: repoUrl ? repoUrl.trim() : null,
    demoUrl: demoUrl ? demoUrl.trim() : null,
    videoUrl: videoUrl ? videoUrl.trim() : null,
    techStack: Array.isArray(techStack) ? techStack.join(', ') : techStack || null,
    status: status || 'DRAFT',
    thumbnailUrl: thumbnailUrl || null,
    imageGallery: imageGallery ? JSON.stringify(imageGallery) : JSON.stringify([]),
    trackId: trackId ? parseInt(trackId, 10) : null,
  };

  let submission;

  if (team.submission) {
    submission = await prisma.submission.update({
      where: { id: team.submission.id },
      data: submissionData,
    });
  } else {
    submission = await prisma.submission.create({
      data: {
        ...submissionData,
        teamId: team.id,
        eventId: team.eventId,
      },
    });
  }

  // Handle Answers
  if (answers && Array.isArray(answers)) {
    // We use a simple loop because SQLite with Prisma doesn't natively support createMany/upsert in a clean array way for related records
    for (const ans of answers) {
      if (ans.questionId && ans.answer) {
        await prisma.submissionAnswer.upsert({
          where: {
            submissionId_questionId: {
              submissionId: submission.id,
              questionId: parseInt(ans.questionId, 10),
            }
          },
          update: {
            answer: ans.answer,
          },
          create: {
            submissionId: submission.id,
            questionId: parseInt(ans.questionId, 10),
            answer: ans.answer,
          }
        });
      }
    }
  }

  return getSubmissionById(submission.id, currentUser);
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
      track: true,
      answers: {
        include: {
          question: true,
        }
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

  if (submission.imageGallery) {
    try {
      submission.imageGallery = JSON.parse(submission.imageGallery);
    } catch(e) {
      submission.imageGallery = [];
    }
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
      track: true,
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

  return submissions.map((sub) => {
    let copy = { ...sub };
    if (copy.imageGallery) {
      try {
        copy.imageGallery = JSON.parse(copy.imageGallery);
      } catch (e) {
        copy.imageGallery = [];
      }
    }
    if (!isOrganizer && !isJudge && !isPublished) {
      delete copy.scores;
    }
    return copy;
  });
};

const getPublicGallery = async (eventId, queryParams) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const { search, trackId, techTags } = queryParams;

  let whereClause = {
    eventId: parseInt(eventId, 10),
    status: 'SUBMITTED', // Only show completed submissions to public
  };

  if (search) {
    whereClause.OR = [
      { title: { contains: search } },
      { tagline: { contains: search } },
    ];
  }

  if (trackId) {
    whereClause.trackId = parseInt(trackId, 10);
  }
  
  if (techTags) {
    whereClause.techStack = { contains: techTags };
  }

  const submissions = await prisma.submission.findMany({
    where: whereClause,
    include: {
      team: {
        select: { id: true, name: true },
      },
      track: true,
    },
    orderBy: { submittedAt: 'desc' },
  });

  return submissions.map((sub) => {
    let copy = { ...sub };
    if (copy.imageGallery) {
      try {
        copy.imageGallery = JSON.parse(copy.imageGallery);
      } catch (e) {
        copy.imageGallery = [];
      }
    }
    return copy;
  });
};

module.exports = {
  createOrUpdateSubmission,
  getSubmissionById,
  getSubmissionsByEvent,
  getPublicGallery,
};
