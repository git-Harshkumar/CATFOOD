const prisma = require('../utils/prisma');

const submitScores = async (eventId, userId, submissionId, scoresPayload) => {
  const judge = await prisma.judge.findUnique({
    where: { eventId_userId: { eventId: parseInt(eventId, 10), userId } }
  });
  if (!judge) {
    const error = new Error('Judge profile not found for this event.');
    error.statusCode = 403;
    throw error;
  }
  const judgeId = judge.id;

  const submission = await prisma.submission.findUnique({
    where: { id: parseInt(submissionId, 10) },
    include: {
      event: {
        include: { criteria: true },
      },
    },
  });

  if (!submission) {
    const error = new Error('Submission not found.');
    error.statusCode = 404;
    throw error;
  }

  const validCriterionMap = new Map();
  submission.event.criteria.forEach((c) => validCriterionMap.set(c.id, c));

  for (const item of scoresPayload) {
    const criterion = validCriterionMap.get(item.criterionId);
    if (!criterion) {
      const error = new Error(`Criterion ID ${item.criterionId} does not belong to this event.`);
      error.statusCode = 400;
      throw error;
    }
    if (item.score < 0 || item.score > criterion.maxScore) {
      const error = new Error(
        `Score for criterion '${criterion.name}' must be between 0 and ${criterion.maxScore}. Received: ${item.score}`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const upsertedScores = await prisma.$transaction(
    scoresPayload.map((item) =>
      prisma.score.upsert({
        where: {
          submissionId_judgeId_criterionId: {
            submissionId: submission.id,
            judgeId,
            criterionId: item.criterionId,
          },
        },
        update: {
          score: item.score,
          feedback: item.feedback || null,
        },
        create: {
          submissionId: submission.id,
          judgeId,
          criterionId: item.criterionId,
          score: item.score,
          feedback: item.feedback || null,
        },
        include: {
          criterion: true,
        },
      })
    )
  );

  return upsertedScores;
};

const getSubmissionScoresByJudge = async (eventId, submissionId, userId) => {
  const judge = await prisma.judge.findUnique({
    where: { eventId_userId: { eventId: parseInt(eventId, 10), userId } }
  });
  if (!judge) return [];

  return prisma.score.findMany({
    where: {
      submissionId: parseInt(submissionId, 10),
      judgeId: judge.id,
    },
    include: {
      criterion: true,
    },
  });
};

const getLeaderboard = async (eventId, currentUser) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
    include: {
      criteria: true,
      submissions: {
        include: {
          team: {
            select: { id: true, name: true, leader: { select: { id: true, name: true } } },
          },
          scores: {
            include: {
              judge: { include: { user: { select: { id: true, name: true } } } },
              criterion: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  let eventRole = null;
  if (currentUser && !currentUser.isGlobalAdmin) {
    const member = await prisma.eventMember.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: currentUser.id } }
    });
    if (member) eventRole = member.role;
  }
  
  const isOrganizer = currentUser?.isGlobalAdmin || eventRole === 'ORGANIZER' || event.organizerId === currentUser?.id;
  const isJudge = eventRole === 'JUDGE';

  if (!event.isLeaderboardPublished && !isOrganizer && !isJudge) {
    const error = new Error('The final leaderboard for this hackathon has not been published yet.');
    error.statusCode = 403;
    throw error;
  }

  const rankings = event.submissions.map((sub) => {
    const criteriaScores = {};
    event.criteria.forEach((crit) => {
      criteriaScores[crit.id] = {
        criterion: crit,
        scores: [],
      };
    });

    const judgesSet = new Set();
    sub.scores.forEach((s) => {
      judgesSet.add(s.judgeId);
      if (criteriaScores[s.criterionId]) {
        criteriaScores[s.criterionId].scores.push(s.score);
      }
    });

    let totalWeightedScore = 0;
    let totalMaxPossible = 0;
    const criterionBreakdown = [];

    event.criteria.forEach((crit) => {
      const recorded = criteriaScores[crit.id].scores;
      const avgScore = recorded.length > 0
        ? recorded.reduce((sum, val) => sum + val, 0) / recorded.length
        : 0;

      const weightedScore = avgScore * crit.weight;
      totalWeightedScore += weightedScore;
      totalMaxPossible += crit.maxScore * crit.weight;

      criterionBreakdown.push({
        criterionId: crit.id,
        criterionName: crit.name,
        maxScore: crit.maxScore,
        weight: crit.weight,
        averageScore: Math.round(avgScore * 100) / 100,
        weightedScore: Math.round(weightedScore * 100) / 100,
      });
    });

    const percentage = totalMaxPossible > 0
      ? Math.round((totalWeightedScore / totalMaxPossible) * 1000) / 10
      : 0;

    return {
      submissionId: sub.id,
      title: sub.title,
      tagline: sub.tagline,
      teamId: sub.team.id,
      teamName: sub.team.name,
      repoUrl: sub.repoUrl,
      demoUrl: sub.demoUrl,
      judgeCount: judgesSet.size,
      totalWeightedScore: Math.round(totalWeightedScore * 100) / 100,
      totalMaxPossible: Math.round(totalMaxPossible * 100) / 100,
      percentage,
      criterionBreakdown,
    };
  });

  rankings.sort((a, b) => b.totalWeightedScore - a.totalWeightedScore);

  rankings.forEach((item, index) => {
    item.rank = index + 1;
  });

  return {
    eventId: event.id,
    eventTitle: event.title,
    isLeaderboardPublished: event.isLeaderboardPublished,
    totalSubmissions: rankings.length,
    rankings,
  };
};

const getJudgeQueue = async (eventId, userId) => {
  if (!eventId) {
    const judgeProfiles = await prisma.judge.findMany({
      where: { userId },
    });
    if (!judgeProfiles.length) return [];
    const allQueues = await Promise.all(
      judgeProfiles.map((j) => getJudgeQueue(j.eventId, userId))
    );
    return allQueues.flat();
  }

  const judge = await prisma.judge.findUnique({
    where: { eventId_userId: { eventId: parseInt(eventId, 10), userId } }
  });
  if (!judge) return [];

  const assignments = await prisma.judgeAssignment.findMany({
    where: { judgeId: judge.id },
    select: { submissionId: true },
  });

  const submissionIds = assignments.map((a) => a.submissionId);

  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
    include: {
      criteria: true,
      submissions: {
        where: submissionIds.length > 0 ? { id: { in: submissionIds } } : undefined,
        include: {
          team: { select: { id: true, name: true } },
          scores: {
            where: { judgeId: judge.id },
            include: { criterion: true },
          },
        },
      },
    },
  });

  if (!event) return [];

  const queue = event.submissions.map((sub) => {
    const isEvaluated = sub.scores.length === event.criteria.length && event.criteria.length > 0;
    return {
      submissionId: sub.id,
      title: sub.title,
      teamName: sub.team.name,
      submittedAt: sub.submittedAt,
      isEvaluated,
      scoresCount: sub.scores.length,
      totalCriteriaCount: event.criteria.length,
    };
  });

  return [{
    eventId: event.id,
    eventTitle: event.title,
    status: event.status,
    deadline: event.deadline,
    submissions: queue,
  }];
};

module.exports = {
  submitScores,
  getSubmissionScoresByJudge,
  getLeaderboard,
  getJudgeQueue,
};
