const prisma = require('../utils/prisma');
const judgingEngine = require('./judgingEngine');
const auditService = require('./auditService');
const { formatCsv } = require('../utils/csv');

/**
 * Submit judge scores for a submission with strict track and assignment isolation.
 * 
 * @param {number|string} eventId
 * @param {number} userId
 * @param {number|string} submissionId
 * @param {Array<Object>} scoresPayload
 * @returns {Promise<Array<Object>>}
 */
const submitScores = async (eventId, userId, submissionId, scoresPayload) => {
  const parsedEventId = parseInt(eventId, 10);
  const parsedSubId = parseInt(submissionId, 10);

  const judge = await prisma.judge.findUnique({
    where: { eventId_userId: { eventId: parsedEventId, userId } },
    include: {
      tracks: true,
      assignments: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!judge) {
    await auditService.logAction({
      actorId: userId,
      action: 'AUTH_DENIED',
      targetType: 'Submission',
      targetId: parsedSubId,
      metadata: { reason: 'User is not a registered judge for event', eventId: parsedEventId },
    });
    const error = new Error('Judge profile not found for this event.');
    error.statusCode = 403;
    throw error;
  }

  const submission = await prisma.submission.findUnique({
    where: { id: parsedSubId },
    include: {
      event: { include: { criteria: true } },
      track: true,
    },
  });

  if (!submission) {
    const error = new Error('Submission not found.');
    error.statusCode = 404;
    throw error;
  }

  // Track Isolation Check
  if (judge.tracks && judge.tracks.length > 0) {
    const allowedTrackIds = judge.tracks.map((t) => t.trackId);
    if (submission.trackId && !allowedTrackIds.includes(submission.trackId)) {
      await auditService.logAction({
        actorId: userId,
        action: 'AUTH_DENIED',
        targetType: 'Submission',
        targetId: submission.id,
        metadata: {
          reason: 'TRACK_ISOLATION_VIOLATION',
          judgeTracks: allowedTrackIds,
          submissionTrack: submission.trackId,
        },
      });
      const error = new Error('Forbidden. You are not authorized to score submissions outside your assigned track.');
      error.statusCode = 403;
      throw error;
    }
  }

  // Assignment Isolation Check (if judge has assigned projects, must be assigned to this one)
  if (judge.assignments && judge.assignments.length > 0) {
    const isAssigned = judge.assignments.some((a) => a.submissionId === submission.id);
    if (!isAssigned) {
      await auditService.logAction({
        actorId: userId,
        action: 'AUTH_DENIED',
        targetType: 'Submission',
        targetId: submission.id,
        metadata: { reason: 'PROJECT_NOT_ASSIGNED', submissionId: submission.id },
      });
      const error = new Error('Forbidden. This submission is not assigned to you for evaluation.');
      error.statusCode = 403;
      throw error;
    }
  }

  // Validate Criteria & Score Ranges
  const validCriterionMap = new Map();
  submission.event.criteria.forEach((c) => validCriterionMap.set(c.id, c));

  for (const item of scoresPayload) {
    const criterion = validCriterionMap.get(item.criterionId);
    if (!criterion) {
      const error = new Error(`Criterion ID ${item.criterionId} does not belong to this event.`);
      error.statusCode = 400;
      throw error;
    }
    const scoreVal = Number(item.score);
    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > criterion.maxScore) {
      const error = new Error(
        `Score for criterion '${criterion.name}' must be between 0 and ${criterion.maxScore}. Received: ${item.score}`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Calculate authoritative weighted calculation
  const weightedResult = judgingEngine.calculateWeightedScore(scoresPayload, submission.event.criteria);

  // Atomic database transaction to persist scores and update assignment status
  const upsertedScores = await prisma.$transaction([
    ...scoresPayload.map((item) =>
      prisma.score.upsert({
        where: {
          submissionId_judgeId_criterionId: {
            submissionId: submission.id,
            judgeId: judge.id,
            criterionId: item.criterionId,
          },
        },
        update: {
          score: Number(item.score),
          feedback: item.feedback || null,
        },
        create: {
          submissionId: submission.id,
          judgeId: judge.id,
          criterionId: item.criterionId,
          score: Number(item.score),
          feedback: item.feedback || null,
        },
        include: {
          criterion: true,
        },
      })
    ),
    prisma.judgeAssignment.upsert({
      where: {
        judgeId_submissionId: {
          judgeId: judge.id,
          submissionId: submission.id,
        },
      },
      update: {
        status: 'COMPLETED',
      },
      create: {
        judgeId: judge.id,
        submissionId: submission.id,
        status: 'COMPLETED',
        trackId: submission.trackId || null,
      },
    }),
  ]);

  // First N items are the scores
  const scoreRecords = upsertedScores.slice(0, scoresPayload.length);

  await auditService.logAction({
    actorId: userId,
    action: 'SCORE_SUBMITTED',
    targetType: 'Submission',
    targetId: submission.id,
    metadata: {
      judgeId: judge.id,
      scoresCount: scoresPayload.length,
      totalWeightedScore: weightedResult.totalWeightedScore,
      percentage: weightedResult.percentage,
    },
  });

  return scoreRecords;
};

/**
 * Retrieve scores submitted by a judge for a specific submission.
 * Enforces role isolation.
 */
const getSubmissionScoresByJudge = async (eventId, submissionId, requestingUserId) => {
  const parsedSubId = parseInt(submissionId, 10);
  const parsedEventId = eventId ? parseInt(eventId, 10) : null;

  const submission = await prisma.submission.findUnique({
    where: { id: parsedSubId },
    include: { event: true },
  });

  if (!submission) {
    const error = new Error('Submission not found.');
    error.statusCode = 404;
    throw error;
  }

  const effectiveEventId = parsedEventId || submission.eventId;

  // Check if requesting user is a judge for this event
  const judge = await prisma.judge.findUnique({
    where: { eventId_userId: { eventId: effectiveEventId, userId: requestingUserId } },
    include: { tracks: true, assignments: true },
  });

  if (judge) {
    // Track isolation
    if (judge.tracks && judge.tracks.length > 0) {
      const allowedTrackIds = judge.tracks.map((t) => t.trackId);
      if (submission.trackId && !allowedTrackIds.includes(submission.trackId)) {
        const error = new Error('Forbidden. You are not authorized to view scores for submissions outside your track.');
        error.statusCode = 403;
        throw error;
      }
    }

    // Return ONLY this judge's scores
    return prisma.score.findMany({
      where: {
        submissionId: parsedSubId,
        judgeId: judge.id,
      },
      include: {
        criterion: true,
      },
    });
  }

  // Check if requesting user is event organizer
  const isOrganizer = submission.event.organizerId === requestingUserId;
  if (isOrganizer) {
    return prisma.score.findMany({
      where: { submissionId: parsedSubId },
      include: {
        criterion: true,
        judge: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
  }

  // Participants or non-event members are forbidden
  const error = new Error('Forbidden. You do not have permission to view scores for this submission.');
  error.statusCode = 403;
  throw error;
};

/**
 * Retrieve judge scores with strict peer-isolation and parameter-tampering defense.
 * - Judge A reading Judge A's scores -> 200 OK
 * - Judge B attempting to read Judge A's scores -> 403 Forbidden
 * - Participant attempting to read judge scores -> 403 Forbidden
 * - Unauthenticated -> 401 Unauthorized
 * 
 * @param {Object} currentUser
 * @param {Object} query - Query parameters (e.g. ?judge=judge_a or ?judgeId=...)
 * @returns {Promise<Array<Object>>}
 */
const getJudgeScoresSecurely = async (currentUser, query = {}) => {
  if (!currentUser) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }

  // Find all judge profiles for this user across events
  const userJudgeProfiles = await prisma.judge.findMany({
    where: { userId: currentUser.id },
    include: { event: true },
  });

  const isJudge = userJudgeProfiles.length > 0;
  const isGlobalAdmin = currentUser.isGlobalAdmin;

  // Check if user is organizer of any events
  const organizedEvents = await prisma.event.findMany({
    where: { organizerId: currentUser.id },
    select: { id: true },
  });
  const isOrganizer = organizedEvents.length > 0;

  // If user is neither a judge nor organizer/admin -> STRICT 403 FORBIDDEN
  if (!isJudge && !isOrganizer && !isGlobalAdmin) {
    await auditService.logAction({
      actorId: currentUser.id,
      action: 'AUTH_DENIED',
      targetType: 'Score',
      metadata: { reason: 'PARTICIPANT_ACCESS_JUDGE_SCORES', userId: currentUser.id },
    });
    const error = new Error('Forbidden. Participants are not authorized to view judge scores.');
    error.statusCode = 403;
    throw error;
  }

  // Parameter Tampering Detection:
  // If ?judge= or ?judgeId= is provided by a judge, verify it refers to THEMSELVES
  const targetJudgeParam = query.judge || query.judgeId || query.judgeEmail;
  if (targetJudgeParam && !isGlobalAdmin) {
    const paramStr = String(targetJudgeParam).toLowerCase().trim();
    const userEmail = (currentUser.email || '').toLowerCase().trim();
    const userName = (currentUser.name || '').toLowerCase().trim();
    const userIdStr = String(currentUser.id);

    // Check if parameter matches this user's identity
    const matchesUser =
      paramStr === userEmail ||
      paramStr === userName ||
      paramStr === userIdStr ||
      userJudgeProfiles.some((jp) => String(jp.id) === paramStr);

    if (!matchesUser) {
      // If user is an organizer, they can inspect judges within their own event
      if (isOrganizer) {
        const organizerEventIds = organizedEvents.map((e) => e.id);
        const targetJudge = await prisma.judge.findFirst({
          where: {
            OR: [
              { user: { email: paramStr } },
              { user: { name: { contains: paramStr } } },
              { id: isNaN(parseInt(paramStr, 10)) ? undefined : parseInt(paramStr, 10) },
            ].filter(Boolean),
            eventId: { in: organizerEventIds },
          },
        });

        if (!targetJudge) {
          await auditService.logAction({
            actorId: currentUser.id,
            action: 'AUTH_DENIED',
            targetType: 'Score',
            metadata: { reason: 'ORGANIZER_INSPECT_CROSS_EVENT_JUDGE', query: targetJudgeParam },
          });
          const error = new Error('Forbidden. You can only inspect judges in events you organize.');
          error.statusCode = 403;
          throw error;
        }

        // Return scores for the target judge in organizer's events
        return prisma.score.findMany({
          where: { judgeId: targetJudge.id },
          include: {
            criterion: true,
            submission: { select: { id: true, title: true, teamId: true } },
          },
        });
      }

      // Judge attempting to read another judge's scores -> 403 FORBIDDEN
      await auditService.logAction({
        actorId: currentUser.id,
        action: 'AUTH_DENIED',
        targetType: 'Score',
        metadata: {
          reason: 'CROSS_JUDGE_SCORE_READ_ATTEMPT',
          requestingUser: currentUser.email,
          attemptedJudgeTarget: targetJudgeParam,
        },
      });

      const error = new Error('Forbidden. You do not have permission to access another judge\'s scores.');
      error.statusCode = 403;
      throw error;
    }
  }

  // Return the authenticated judge's own scores
  const judgeIds = userJudgeProfiles.map((j) => j.id);
  if (judgeIds.length === 0 && !isOrganizer) {
    return [];
  }

  const whereClause = isOrganizer && !isJudge
    ? { submission: { eventId: { in: organizedEvents.map((e) => e.id) } } }
    : { judgeId: { in: judgeIds } };

  return prisma.score.findMany({
    where: whereClause,
    include: {
      criterion: true,
      submission: {
        select: { id: true, title: true, teamId: true, eventId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Retrieve the evaluation queue for a judge with strict track and assignment isolation.
 */
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

  const parsedEventId = parseInt(eventId, 10);
  const judge = await prisma.judge.findUnique({
    where: { eventId_userId: { eventId: parsedEventId, userId } },
    include: { tracks: true },
  });

  if (!judge) return [];

  const assignments = await prisma.judgeAssignment.findMany({
    where: { judgeId: judge.id },
    include: { track: true },
  });

  const assignmentSubmissionIds = assignments.map((a) => a.submissionId);
  const judgeTrackIds = judge.tracks.map((jt) => jt.trackId);

  // Determine which submissions this judge is eligible to see:
  // 1. If judge has explicit assignments, use those
  // 2. Otherwise (open event judging), use submissions in judge's tracks (or all if no tracks assigned)
  let submissionFilter = {};
  if (assignmentSubmissionIds.length > 0) {
    submissionFilter = { id: { in: assignmentSubmissionIds } };
  } else if (judgeTrackIds.length > 0) {
    submissionFilter = { trackId: { in: judgeTrackIds } };
  } else {
    submissionFilter = {};
  }

  const event = await prisma.event.findUnique({
    where: { id: parsedEventId },
    include: {
      criteria: true,
      submissions: {
        where: submissionFilter,
        include: {
          team: { select: { id: true, name: true } },
          track: true,
          scores: {
            where: { judgeId: judge.id },
            include: { criterion: true },
          },
        },
      },
    },
  });

  if (!event) return [];

  const assignmentBatchMap = new Map();
  assignments.forEach((a) => {
    if (a.batch) assignmentBatchMap.set(a.submissionId, a.batch);
  });

  const queue = event.submissions.map((sub) => {
    const isEvaluated = sub.scores.length === event.criteria.length && event.criteria.length > 0;
    return {
      submissionId: sub.id,
      title: sub.title,
      teamName: sub.team?.name,
      trackName: sub.track?.name || 'General',
      trackId: sub.trackId,
      batch: assignmentBatchMap.get(sub.id) || null,
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

/**
 * Organizer progress dashboard metrics.
 * Backend-derived and protected.
 */
const getJudgingProgress = async (eventId, requestingUser) => {
  const parsedEventId = parseInt(eventId, 10);
  const event = await prisma.event.findUnique({
    where: { id: parsedEventId },
    include: {
      criteria: true,
      tracks: true,
      judges: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          assignments: true,
          scores: true,
          tracks: { include: { track: true } },
        },
      },
      submissions: {
        include: {
          team: { select: { id: true, name: true } },
          track: true,
          assignments: true,
          scores: { include: { criterion: true } },
          normalizedScores: true,
        },
      },
    },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isOrganizer = requestingUser.isGlobalAdmin || event.organizerId === requestingUser.id;
  if (!isOrganizer) {
    await auditService.logAction({
      actorId: requestingUser.id,
      action: 'AUTH_DENIED',
      targetType: 'Event',
      targetId: event.id,
      metadata: { reason: 'NON_ORGANIZER_PROGRESS_ACCESS' },
    });
    const error = new Error('Forbidden. Only event organizers can access the judging progress dashboard.');
    error.statusCode = 403;
    throw error;
  }

  const criteriaCount = event.criteria.length;

  // 1. Judge-Level Progress
  const judgeProgress = event.judges.map((j) => {
    const assignedCount = j.assignments.length;
    // Count distinct submissions evaluated
    const scoredSubmissions = new Set(j.scores.map((s) => s.submissionId));
    const completedCount = scoredSubmissions.size;
    const pendingCount = Math.max(0, assignedCount - completedCount);
    const percentage = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;

    return {
      judgeId: j.id,
      userId: j.user.id,
      name: j.user.name,
      email: j.user.email,
      status: j.status,
      assignedCount,
      completedCount,
      pendingCount,
      percentage,
      tracks: j.tracks.map((jt) => jt.track.name),
    };
  });

  // 2. Project-Level Progress
  const projectProgress = event.submissions.map((sub) => {
    const assignedJudges = sub.assignments.length;
    const distinctJudgesScored = new Set(sub.scores.map((s) => s.judgeId));
    const completedReviews = distinctJudgesScored.size;
    const pendingReviews = Math.max(0, assignedJudges - completedReviews);
    const completionPercentage = assignedJudges > 0
      ? Math.round((completedReviews / assignedJudges) * 100)
      : (completedReviews > 0 ? 100 : 0);

    // Compute raw average score
    const totalScoreSum = sub.scores.reduce((sum, s) => sum + s.score, 0);
    const rawAverage = sub.scores.length > 0
      ? Math.round((totalScoreSum / distinctJudgesScored.size) * 100) / 100
      : 0;

    return {
      submissionId: sub.id,
      title: sub.title,
      teamName: sub.team?.name,
      trackName: sub.track?.name || 'General',
      assignedJudges,
      completedReviews,
      pendingReviews,
      completionPercentage,
      rawAverage,
      normalizedScore: sub.normalizedScores[0]?.normalizedScore || null,
      status: completedReviews >= assignedJudges && assignedJudges > 0 ? 'COMPLETED' : 'IN_PROGRESS',
    };
  });

  // 3. Overall Event Progress
  const totalAssignedReviews = event.submissions.reduce((sum, s) => sum + s.assignments.length, 0);
  const totalCompletedReviews = projectProgress.reduce((sum, p) => sum + p.completedReviews, 0);
  const overallPercentage = totalAssignedReviews > 0
    ? Math.round((totalCompletedReviews / totalAssignedReviews) * 100)
    : 0;

  return {
    eventId: event.id,
    eventTitle: event.title,
    criteriaCount,
    totalJudges: event.judges.length,
    totalSubmissions: event.submissions.length,
    totalAssignedReviews,
    totalCompletedReviews,
    overallPercentage,
    judgeProgress,
    projectProgress,
  };
};

/**
 * Execute cross-judge z-score normalization and store results.
 */
const runEventNormalization = async (eventId, organizerId) => {
  const parsedEventId = parseInt(eventId, 10);
  const event = await prisma.event.findUnique({
    where: { id: parsedEventId },
    include: {
      criteria: true,
      judges: { include: { user: { select: { id: true, name: true } } } },
      submissions: {
        include: {
          scores: true,
          team: { select: { id: true, name: true } },
          track: true,
        },
      },
    },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  if (event.organizerId !== organizerId) {
    const error = new Error('Unauthorized. Only event organizers can execute normalization.');
    error.statusCode = 403;
    throw error;
  }

  // Calculate total weighted score for each judge evaluation per submission
  const rawEvaluations = [];
  const criteria = event.criteria;

  for (const sub of event.submissions) {
    // Group scores by judgeId
    const scoresByJudge = new Map();
    for (const score of sub.scores) {
      if (!scoresByJudge.has(score.judgeId)) {
        scoresByJudge.set(score.judgeId, []);
      }
      scoresByJudge.get(score.judgeId).push(score);
    }

    for (const [judgeId, judgeScores] of scoresByJudge.entries()) {
      const weighted = judgingEngine.calculateWeightedScore(judgeScores, criteria);
      rawEvaluations.push({
        judgeId,
        submissionId: sub.id,
        rawScore: weighted.totalWeightedScore,
        maxPossible: weighted.totalMaxPossible,
      });
    }
  }

  // Execute Z-Score Normalization with robust edge cases
  const { normalizedScores, judgeStats, globalStats } = judgingEngine.normalizeScores(rawEvaluations);

  // Store normalized scores into NormalizedScore table
  // Clear previous normalized scores for this event
  await prisma.normalizedScore.deleteMany({
    where: { eventId: event.id },
  });

  // Batch insert new normalized scores
  if (normalizedScores.length > 0) {
    await prisma.normalizedScore.createMany({
      data: normalizedScores.map((ns) => ({
        eventId: event.id,
        submissionId: ns.submissionId,
        judgeId: ns.judgeId,
        rawScore: ns.rawScore,
        normalizedScore: ns.normalizedScore,
        metadata: JSON.stringify(ns.metadata),
      })),
    });
  }

  // Build final ranked standings
  const submissionsWithNormalized = await prisma.submission.findMany({
    where: { eventId: event.id },
    include: {
      team: { select: { id: true, name: true } },
      track: true,
      scores: true,
      normalizedScores: { where: { eventId: event.id } },
    },
  });

  const standings = judgingEngine.aggregateFinalStandings(submissionsWithNormalized, criteria);

  await auditService.logAction({
    actorId: organizerId,
    action: 'NORMALIZATION_EXECUTED',
    targetType: 'Event',
    targetId: event.id,
    metadata: {
      evaluationsCount: rawEvaluations.length,
      globalMean: globalStats.mean,
      globalStdDev: globalStats.stdDev,
    },
  });

  return {
    eventId: event.id,
    evaluationsNormalized: normalizedScores.length,
    globalStats,
    judgeStats,
    standings,
  };
};

/**
 * Export judging data as RFC-4180 compliant CSV.
 * Organizer only.
 */
const exportJudgingCsv = async (eventId, type = 'results', requestingUser) => {
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
          assignments: true,
          scores: true,
        },
      },
      submissions: {
        include: {
          team: { select: { id: true, name: true } },
          track: true,
          scores: {
            include: {
              criterion: true,
              judge: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
          },
          normalizedScores: true,
          assignments: {
            include: {
              judge: { include: { user: { select: { id: true, name: true, email: true } } } },
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

  const isOrganizer = requestingUser.isGlobalAdmin || event.organizerId === requestingUser.id;
  if (!isOrganizer) {
    await auditService.logAction({
      actorId: requestingUser.id,
      action: 'AUTH_DENIED',
      targetType: 'Event',
      targetId: event.id,
      metadata: { reason: 'NON_ORGANIZER_CSV_EXPORT_ATTEMPT' },
    });
    const error = new Error('Forbidden. Only organizers are authorized to export judging CSV data.');
    error.statusCode = 403;
    throw error;
  }

  let headers = [];
  let rows = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `event-${event.id}-${type}-${timestamp}.csv`;

  if (type === 'scores' || type === 'raw') {
    headers = [
      'Submission ID',
      'Project Title',
      'Team Name',
      'Track',
      'Judge Name',
      'Judge Email',
      'Criterion',
      'Raw Score',
      'Max Score',
      'Weight',
      'Weighted Score',
      'Feedback',
      'Submitted At',
    ];

    for (const sub of event.submissions) {
      for (const score of sub.scores) {
        const weightedScore = Math.round(score.score * score.criterion.weight * 100) / 100;
        rows.push([
          sub.id,
          sub.title,
          sub.team?.name || '',
          sub.track?.name || 'General',
          score.judge.user.name,
          score.judge.user.email,
          score.criterion.name,
          score.score,
          score.criterion.maxScore,
          score.criterion.weight,
          weightedScore,
          score.feedback || '',
          score.createdAt.toISOString(),
        ]);
      }
    }
  } else if (type === 'assignments') {
    headers = [
      'Assignment ID',
      'Judge Name',
      'Judge Email',
      'Submission ID',
      'Project Title',
      'Track',
      'Batch',
      'Status',
      'Assigned At',
    ];

    for (const sub of event.submissions) {
      for (const a of sub.assignments) {
        rows.push([
          a.id,
          a.judge.user.name,
          a.judge.user.email,
          sub.id,
          sub.title,
          sub.track?.name || 'General',
          a.batch || '',
          a.status,
          a.createdAt.toISOString(),
        ]);
      }
    }
  } else if (type === 'progress') {
    headers = [
      'Judge ID',
      'Judge Name',
      'Judge Email',
      'Assigned Projects',
      'Completed Reviews',
      'Pending Reviews',
      'Completion %',
      'Status',
    ];

    for (const j of event.judges) {
      const assignedCount = j.assignments.length;
      const scoredDistinct = new Set(j.scores.map((s) => s.submissionId)).size;
      const pendingCount = Math.max(0, assignedCount - scoredDistinct);
      const pct = assignedCount > 0 ? Math.round((scoredDistinct / assignedCount) * 100) : 0;

      rows.push([
        j.id,
        j.user.name,
        j.user.email,
        assignedCount,
        scoredDistinct,
        pendingCount,
        `${pct}%`,
        j.status,
      ]);
    }
  } else {
    // Default: 'results' / 'final'
    headers = [
      'Rank',
      'Submission ID',
      'Project Title',
      'Team Name',
      'Track',
      'Reviews Completed',
      'Raw Average Score',
      'Normalized Score',
      'Status',
    ];

    const standings = judgingEngine.aggregateFinalStandings(event.submissions, event.criteria);
    for (const item of standings) {
      rows.push([
        item.rank,
        item.submissionId,
        item.title,
        item.teamName || '',
        item.trackName,
        item.reviewCount,
        item.rawAverage,
        item.finalNormalizedScore,
        item.status,
      ]);
    }
  }

  const csvContent = formatCsv(headers, rows);

  await auditService.logAction({
    actorId: requestingUser.id,
    action: 'CSV_EXPORTED',
    targetType: 'Event',
    targetId: event.id,
    metadata: { type, rowCount: rows.length, filename },
  });

  return {
    filename,
    csvContent,
  };
};

/**
 * Retrieve final event leaderboard with both raw and normalized standings.
 */
const getLeaderboard = async (eventId, currentUser) => {
  const parsedEventId = parseInt(eventId, 10);
  const event = await prisma.event.findUnique({
    where: { id: parsedEventId },
    include: {
      criteria: true,
      tracks: true,
      submissions: {
        include: {
          team: {
            select: { id: true, name: true, leader: { select: { id: true, name: true } } },
          },
          track: true,
          scores: {
            include: {
              judge: { include: { user: { select: { id: true, name: true } } } },
              criterion: true,
            },
          },
          normalizedScores: true,
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
      where: { eventId_userId: { eventId: event.id, userId: currentUser.id } },
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

  // Calculate standings
  const rankings = event.submissions.map((sub) => {
    const criteriaScores = {};
    event.criteria.forEach((crit) => {
      criteriaScores[crit.id] = { criterion: crit, scores: [] };
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

    // Retrieve normalized score if available
    const normalizedAvg = sub.normalizedScores.length > 0
      ? sub.normalizedScores.reduce((sum, ns) => sum + ns.normalizedScore, 0) / sub.normalizedScores.length
      : Math.round((totalWeightedScore / (totalMaxPossible || 1)) * 1000) / 100;

    return {
      submissionId: sub.id,
      title: sub.title,
      tagline: sub.tagline,
      teamId: sub.team.id,
      teamName: sub.team.name,
      trackName: sub.track?.name || 'General',
      trackId: sub.trackId,
      repoUrl: sub.repoUrl,
      demoUrl: sub.demoUrl,
      judgeCount: judgesSet.size,
      totalWeightedScore: Math.round(totalWeightedScore * 100) / 100,
      totalMaxPossible: Math.round(totalMaxPossible * 100) / 100,
      percentage,
      normalizedScore: Math.round(normalizedAvg * 100) / 100,
      criterionBreakdown,
    };
  });

  // Sort by normalizedScore if normalization run, else by totalWeightedScore
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

module.exports = {
  submitScores,
  getSubmissionScoresByJudge,
  getJudgeScoresSecurely,
  getJudgeQueue,
  getJudgingProgress,
  runEventNormalization,
  exportJudgingCsv,
  getLeaderboard,
};
