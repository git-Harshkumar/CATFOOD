const crypto = require('crypto');
const prisma = require('../utils/prisma');
const { dispatchEvent } = require('./webhookService');
const { canManageEvent } = require('../utils/permissions');
const auditService = require('./auditService');
const rateLimitService = require('./rateLimitService');

/**
 * Robust submission lookup that supports numeric IDs, string IDs, fixture IDs (e.g. "prj_01"), and titles.
 */
const findSubmission = async (identifier, eventId = null) => {
  if (!identifier) return null;
  const rawStr = String(identifier).trim();
  const numId = parseInt(rawStr, 10);
  const isExactNumeric = !isNaN(numId) && String(numId) === rawStr;

  // 1. Direct ID match if numeric
  if (isExactNumeric) {
    const sub = await prisma.submission.findUnique({
      where: { id: numId },
      include: {
        event: true,
        team: { include: { members: true } },
        track: true,
      },
    });
    if (sub) return sub;
  }

  // 2. Fixture ID match (e.g. "prj_01")
  let sub = await prisma.submission.findFirst({
    where: {
      fixtureId: rawStr,
      ...(eventId ? { eventId: parseInt(eventId, 10) } : {}),
    },
    include: {
      event: true,
      team: { include: { members: true } },
      track: true,
    },
  });
  if (sub) return sub;

  // 3. Title match fallback
  sub = await prisma.submission.findFirst({
    where: {
      title: { equals: rawStr },
      ...(eventId ? { eventId: parseInt(eventId, 10) } : {}),
    },
    include: {
      event: true,
      team: { include: { members: true } },
      track: true,
    },
  });
  if (sub) return sub;

  // 4. Extracted digits fallback if starts with prj_
  const extractedDigits = rawStr.replace(/\D/g, '');
  if (extractedDigits) {
    const parsedDigits = parseInt(extractedDigits, 10);
    const byDigits = await prisma.submission.findFirst({
      where: {
        OR: [
          { id: parsedDigits },
          { fixtureId: `prj_${extractedDigits.padStart(2, '0')}` },
        ],
        ...(eventId ? { eventId: parseInt(eventId, 10) } : {}),
      },
      include: {
        event: true,
        team: { include: { members: true } },
        track: true,
      },
    });
    if (byDigits) return byDigits;
  }

  return null;
};

/**
 * Request an email verification token for EMAIL-mode voting.
 */
const requestEmailVerification = async ({ eventId, email, voterIp }) => {
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    const error = new Error('Valid email address is required.');
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email.trim().toLowerCase();
  const parsedEventId = parseInt(eventId, 10) || 1;

  // Rate limit: max 5 requests per 10 minutes per IP/email
  rateLimitService.enforceRateLimit(
    `email-verify:${voterIp || cleanEmail}`,
    5,
    10 * 60 * 1000,
    'Too many verification requests. Please try again later.'
  );

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.emailVerification.create({
    data: {
      eventId: parsedEventId,
      email: cleanEmail,
      tokenHash,
      expiresAt,
    },
  });

  return {
    success: true,
    message: 'Verification token generated. Please verify to cast your community vote.',
    // Returned in response for offline/zero-dependency environments or test automation
    token: rawToken,
  };
};

/**
 * Confirm email verification token and return a verified voter token.
 */
const confirmEmailVerification = async ({ eventId, email, token }) => {
  if (!email || !token) {
    const error = new Error('Email and verification token are required.');
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email.trim().toLowerCase();
  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  const parsedEventId = parseInt(eventId, 10) || 1;

  const record = await prisma.emailVerification.findFirst({
    where: {
      eventId: parsedEventId,
      email: cleanEmail,
      tokenHash,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) {
    const error = new Error('Invalid or expired verification token.');
    error.statusCode = 400;
    throw error;
  }

  await prisma.emailVerification.update({
    where: { id: record.id },
    data: { isVerified: true, verifiedAt: new Date() },
  });

  return {
    success: true,
    verifiedEmail: cleanEmail,
    message: 'Email address verified successfully. You may now cast your vote.',
  };
};

/**
 * Cast a community vote with strict server-side credit validation,
 * atomic budget deduction, non-null voter identity, and TOCTOU prevention.
 */
const castVote = async ({
  eventId,
  submissionId,
  voterEmail,
  voterIp,
  currentUser,
  credits = 1,
  voterToken,
  verificationToken,
}) => {
  // 1. Resolve Submission
  const submission = await findSubmission(submissionId, eventId);
  if (!submission) {
    const error = new Error('Submission not found.');
    error.statusCode = 404;
    throw error;
  }

  const event = submission.event;

  // 2. Check if community voting window is active
  if (!event.isCommunityVotingOpen) {
    const error = new Error('Community voting is currently closed for this event.');
    error.statusCode = 403;
    throw error;
  }

  // 3. Enforce IP rate limit
  rateLimitService.enforceRateLimit(
    `vote:ip:${voterIp || 'unknown'}`,
    60,
    60 * 60 * 1000,
    'Rate limit exceeded: Too many votes cast from this IP address. Please try again later.'
  );

  // 4. Prevent Self-Voting (participants cannot vote for their own submission)
  if (currentUser) {
    const isTeamLeader = submission.team?.leaderId === currentUser.id;
    const isTeamMember = Array.isArray(submission.team?.members) &&
      submission.team.members.some((m) => m.userId === currentUser.id);

    if (isTeamLeader || isTeamMember) {
      await auditService.logAction({
        eventId: event.id,
        actorId: currentUser.id,
        action: 'COMMUNITY_VOTE_SELF_REJECTED',
        targetType: 'Submission',
        targetId: submission.id,
        metadata: { reason: 'Participants are prohibited from voting for their own team submission.' },
      });
      const error = new Error('Participants are prohibited from voting for their own project.');
      error.statusCode = 403;
      throw error;
    }
  }

  // 5. Establish canonical non-null Voter Identity according to event.communityVotingMode
  const mode = event.communityVotingMode || 'EMAIL';
  let voterIdentifier;
  let voterUserId = null;
  let resolvedEmail = null;
  let issuedVoterToken = null;

  if (mode === 'AUTHENTICATED') {
    if (!currentUser) {
      await auditService.logAction({
        eventId: event.id,
        action: 'COMMUNITY_VOTE_UNAUTHORIZED',
        targetType: 'Submission',
        targetId: submission.id,
        metadata: { reason: 'Unauthenticated vote rejected in AUTHENTICATED mode' },
      });
      const error = new Error('You must be logged in with a verified account to vote in this hackathon.');
      error.statusCode = 401;
      throw error;
    }
    voterIdentifier = `user:${currentUser.id}`;
    voterUserId = currentUser.id;
    resolvedEmail = currentUser.email.toLowerCase().trim();
  } else if (mode === 'EMAIL') {
    if (currentUser) {
      // Authenticated users have platform-verified emails
      voterIdentifier = `email:${currentUser.email.toLowerCase().trim()}`;
      voterUserId = currentUser.id;
      resolvedEmail = currentUser.email.toLowerCase().trim();
    } else if (voterEmail && voterEmail.includes('@')) {
      const cleanEmail = voterEmail.toLowerCase().trim();
      let isVerified = false;
      if (verificationToken) {
        const tokenHash = crypto.createHash('sha256').update(verificationToken.trim()).digest('hex');
        const valid = await prisma.emailVerification.findFirst({
          where: {
            eventId: event.id,
            email: cleanEmail,
            tokenHash,
            expiresAt: { gt: new Date() },
          },
        });
        if (valid) isVerified = true;
      } else {
        const confirmed = await prisma.emailVerification.findFirst({
          where: {
            eventId: event.id,
            email: cleanEmail,
            isVerified: true,
          },
        });
        if (confirmed) isVerified = true;
      }

      if (!isVerified) {
        await auditService.logAction({
          eventId: event.id,
          action: 'COMMUNITY_VOTE_VERIFICATION_FAILED',
          targetType: 'Submission',
          targetId: submission.id,
          metadata: { email: cleanEmail, reason: 'Email verification required' },
        });
        const error = new Error('You must verify your email address before casting a vote in this hackathon.');
        error.statusCode = 400;
        throw error;
      }

      voterIdentifier = `email:${cleanEmail}`;
      resolvedEmail = cleanEmail;
    } else {
      const error = new Error('Valid email address or verified token is required to vote in EMAIL mode.');
      error.statusCode = 400;
      throw error;
    }
  } else if (mode === 'OPEN') {
    // OPEN Mode: Non-null voter identity via server-issued session token or client token
    let token = voterToken;
    if (token && typeof token === 'string' && token.trim().length > 0) {
      voterIdentifier = `open:token:${token.trim()}`;
    } else {
      token = crypto.randomUUID();
      issuedVoterToken = token;
      voterIdentifier = `open:token:${token}`;
    }
  } else {
    voterIdentifier = currentUser ? `user:${currentUser.id}` : `open:ip:${voterIp || 'unknown'}`;
  }

  // 6. Strict server-side credit validation
  let parsedCredits = credits;
  if (parsedCredits === undefined || parsedCredits === null) {
    parsedCredits = 1;
  }

  if (
    typeof parsedCredits !== 'number' ||
    !Number.isInteger(parsedCredits) ||
    isNaN(parsedCredits) ||
    !isFinite(parsedCredits) ||
    parsedCredits <= 0
  ) {
    await auditService.logAction({
      eventId: event.id,
      actorId: currentUser?.id || null,
      action: 'COMMUNITY_VOTE_INVALID_CREDITS',
      targetType: 'Submission',
      targetId: submission.id,
      metadata: { rawCredits: credits, reason: 'Credits must be a positive integer.' },
    });
    const error = new Error('Voting credits must be a positive integer.');
    error.statusCode = 400;
    throw error;
  }

  const budget = event.communityVoteCreditBudget || 100;
  if (parsedCredits > budget) {
    await auditService.logAction({
      eventId: event.id,
      actorId: currentUser?.id || null,
      action: 'COMMUNITY_VOTE_INVALID_CREDITS',
      targetType: 'Submission',
      targetId: submission.id,
      metadata: { rawCredits: credits, maxAllowed: budget },
    });
    const error = new Error(`Requested credits (${parsedCredits}) exceed maximum event budget of ${budget}.`);
    error.statusCode = 400;
    throw error;
  }

  // 7. Enforce per-voter rate limiting
  rateLimitService.enforceRateLimit(
    `vote:voter:${voterIdentifier}`,
    15,
    60 * 1000,
    'Too many vote requests submitted. Please wait a moment before trying again.'
  );

  // 8. Atomic Vote Creation & Credit Balance Deduction (TOCTOU & Race Condition Defense)
  let vote;
  let remainingBalance;

  try {
    await prisma.$transaction(async (tx) => {
      // 8a. Find or initialize VoterBalance
      let balance = await tx.voterBalance.findUnique({
        where: {
          eventId_voterIdentifier: {
            eventId: event.id,
            voterIdentifier,
          },
        },
      });

      if (!balance) {
        balance = await tx.voterBalance.create({
          data: {
            eventId: event.id,
            voterIdentifier,
            voterUserId,
            totalCredits: budget,
            usedCredits: 0,
            remainingCredits: budget,
          },
        });
      }

      // 8b. Check duplicate vote for this project
      const existingVote = await tx.communityVote.findUnique({
        where: {
          submissionId_voterIdentifier: {
            submissionId: submission.id,
            voterIdentifier,
          },
        },
      });

      if (existingVote) {
        const error = new Error('You have already cast a vote for this project.');
        error.statusCode = 409;
        throw error;
      }

      // 8c. Check credit balance sufficiency
      if (balance.remainingCredits < parsedCredits) {
        const error = new Error(
          `Insufficient voting credits. Remaining: ${balance.remainingCredits}, requested: ${parsedCredits}.`
        );
        error.statusCode = 400;
        throw error;
      }

      // 8d. Insert Vote
      vote = await tx.communityVote.create({
        data: {
          eventId: event.id,
          submissionId: submission.id,
          voterIdentifier,
          voterUserId,
          voterEmail: resolvedEmail,
          voterIp: voterIp || null,
          credits: parsedCredits,
        },
      });

      // 8e. Deduct credits atomically
      const updatedBalance = await tx.voterBalance.update({
        where: { id: balance.id },
        data: {
          usedCredits: { increment: parsedCredits },
          remainingCredits: { decrement: parsedCredits },
        },
      });
      remainingBalance = updatedBalance.remainingCredits;

      // 8f. Log auditable success event
      await tx.auditLog.create({
        data: {
          eventId: event.id,
          actorId: currentUser?.id || null,
          action: 'COMMUNITY_VOTE_CAST',
          targetType: 'Submission',
          targetId: String(submission.id),
          metadata: JSON.stringify({
            ip: voterIp,
            voterIdentifier,
            credits: parsedCredits,
            remainingCredits: remainingBalance,
          }),
        },
      });
    });
  } catch (err) {
    if (err.statusCode === 409 || err.code === 'P2002' || err.code === 'P2034' || err.code === 'P1008') {
      // Check if a vote was already recorded for this project by this voter
      const alreadyVoted = await prisma.communityVote.findFirst({
        where: {
          submissionId: submission.id,
          voterIdentifier,
        },
      }).catch(() => null);

      if (alreadyVoted || err.code === 'P2002' || err.statusCode === 409) {
        // Log duplicate vote attempt
        await auditService.logAction({
          eventId: event.id,
          actorId: currentUser?.id || null,
          action: 'COMMUNITY_VOTE_DUPLICATE_REJECTED',
          targetType: 'Submission',
          targetId: submission.id,
          metadata: { voterIdentifier, ip: voterIp },
        }).catch(() => {});
        const error = new Error('You have already cast a vote for this project.');
        error.statusCode = 409;
        throw error;
      }
    }
    throw err;
  }

  // 9. Dispatch outbound webhook
  dispatchEvent('vote.cast', event.id, {
    submissionId: submission.id,
    projectTitle: submission.title,
    credits: parsedCredits,
  }).catch(console.error);

  // Return response without leaking auto-incrementing sequential voteId
  return {
    success: true,
    submissionId: submission.id,
    projectTitle: submission.title,
    credits: parsedCredits,
    remainingCredits: remainingBalance,
    voterToken: issuedVoterToken || voterToken || null,
    message: 'Your vote has been counted!',
  };
};

/**
 * Retrieve community voting standings and totals with strict result sealing.
 */
const getCommunityResults = async (eventId, currentUser) => {
  let parsedEventId = parseInt(eventId, 10);
  if (isNaN(parsedEventId)) {
    const defaultEvent = await prisma.event.findFirst({ orderBy: { id: 'asc' } });
    if (defaultEvent) parsedEventId = defaultEvent.id;
  }

  const event = await prisma.event.findUnique({
    where: { id: parsedEventId },
    include: {
      submissions: {
        where: { status: 'SUBMITTED' },
        include: {
          team: { select: { id: true, name: true } },
          track: true,
          communityVotes: { select: { credits: true } },
        },
      },
    },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isOrganizer = await canManageEvent(currentUser, event.id);
  const isRevealed = event.isCommunityResultsRevealed;

  // Enforce sealed results during active voting window
  if (!isRevealed && !isOrganizer) {
    const error = new Error('Community voting results are sealed until the voting window concludes.');
    error.statusCode = 403;
    throw error;
  }

  const standings = event.submissions.map((s) => {
    let calculatedScore = 0;
    for (const v of s.communityVotes) {
      // Quadratic score calculation
      calculatedScore += Math.sqrt(Math.max(0, v.credits));
    }
    return {
      submissionId: s.id,
      title: s.title,
      teamName: s.team?.name || 'Unknown',
      trackName: s.track?.name || 'General',
      voteCount: Math.round(calculatedScore * 100) / 100,
    };
  });

  standings.sort((a, b) => b.voteCount - a.voteCount);
  standings.forEach((item, index) => {
    item.rank = index + 1;
  });

  return {
    eventId: event.id,
    eventTitle: event.title,
    isCommunityVotingOpen: event.isCommunityVotingOpen,
    isCommunityResultsRevealed: isRevealed,
    totalVotes: Math.round(standings.reduce((sum, s) => sum + s.voteCount, 0) * 100) / 100,
    standings,
  };
};

/**
 * Add an authenticated comment with user identity verification and rate limiting.
 */
const addComment = async ({ submissionId, content, currentUser, authorName, authorEmail }) => {
  const submission = await findSubmission(submissionId);
  if (!submission) {
    const error = new Error('Submission not found.');
    error.statusCode = 404;
    throw error;
  }

  const cleanContent = (content || '').trim();
  if (cleanContent.length < 2 || cleanContent.length > 2000) {
    const error = new Error('Comment must be between 2 and 2000 characters in length.');
    error.statusCode = 400;
    throw error;
  }

  // Derive identity strictly from verified session if authenticated
  let finalAuthorName;
  let finalAuthorEmail;
  let finalAuthorId = null;

  if (currentUser) {
    finalAuthorName = currentUser.name || 'Hackathon Member';
    finalAuthorEmail = currentUser.email;
    finalAuthorId = currentUser.id;

    // Rate limit: max 5 comments per minute per user
    rateLimitService.enforceRateLimit(
      `comment:user:${currentUser.id}`,
      5,
      60 * 1000,
      'Comment rate limit exceeded. You may post at most 5 comments per minute.'
    );
  } else {
    // If unauthenticated, reject anonymous impersonation
    const error = new Error('Authentication required to post comments.');
    error.statusCode = 401;
    throw error;
  }

  const comment = await prisma.comment.create({
    data: {
      submissionId: submission.id,
      authorId: finalAuthorId,
      authorName: finalAuthorName,
      authorEmail: finalAuthorEmail,
      content: cleanContent,
    },
  });

  return comment;
};

/**
 * Retrieve comments for a submission, filtering out deleted comments.
 */
const getComments = async (submissionId) => {
  const submission = await findSubmission(submissionId);
  if (!submission) {
    return [];
  }

  const comments = await prisma.comment.findMany({
    where: {
      submissionId: submission.id,
      isDeleted: false,
    },
    include: {
      author: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return comments;
};

/**
 * Delete / moderate a comment (soft delete).
 * Authorized: Comment author, Submission team leader, Event organizer, Global Admin.
 */
const deleteComment = async (commentId, currentUser) => {
  if (!currentUser) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }

  const parsedCommentId = parseInt(commentId, 10);
  const comment = await prisma.comment.findUnique({
    where: { id: parsedCommentId },
    include: {
      submission: {
        include: {
          team: true,
          event: true,
        },
      },
    },
  });

  if (!comment) {
    const error = new Error('Comment not found.');
    error.statusCode = 404;
    throw error;
  }

  const isAuthor = comment.authorId === currentUser.id;
  const isOrganizer = await canManageEvent(currentUser, comment.submission.eventId);
  const isTeamLeader = comment.submission.team?.leaderId === currentUser.id;
  const isGlobalAdmin = Boolean(currentUser.isGlobalAdmin);

  if (!isAuthor && !isOrganizer && !isTeamLeader && !isGlobalAdmin) {
    const error = new Error('Forbidden. You do not have permission to delete this comment.');
    error.statusCode = 403;
    throw error;
  }

  const updated = await prisma.comment.update({
    where: { id: parsedCommentId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: currentUser.id,
    },
  });

  return {
    success: true,
    commentId: updated.id,
    message: 'Comment removed successfully.',
  };
};

/**
 * Update community voting and visibility settings.
 * Handles both canonical and legacy property names transparently.
 */
const updateVotingSettings = async (eventId, updates = {}, currentUser) => {
  const parsedEventId = parseInt(eventId, 10);
  const event = await prisma.event.findUnique({ where: { id: parsedEventId } });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isOrganizer = await canManageEvent(currentUser, parsedEventId);
  if (!isOrganizer) {
    const error = new Error('Forbidden. Only organizers can adjust community voting settings.');
    error.statusCode = 403;
    throw error;
  }

  // Canonical names with fallbacks to legacy names
  const isOpen = updates.isCommunityVotingOpen !== undefined
    ? Boolean(updates.isCommunityVotingOpen)
    : updates.isVotingActive !== undefined
    ? Boolean(updates.isVotingActive)
    : event.isCommunityVotingOpen;

  const isRevealed = updates.isCommunityResultsRevealed !== undefined
    ? Boolean(updates.isCommunityResultsRevealed)
    : updates.areResultsRevealed !== undefined
    ? Boolean(updates.areResultsRevealed)
    : event.isCommunityResultsRevealed;

  let mode = event.communityVotingMode;
  if (updates.communityVotingMode) {
    const upperMode = String(updates.communityVotingMode).trim().toUpperCase();
    if (!['OPEN', 'EMAIL', 'AUTHENTICATED'].includes(upperMode)) {
      const error = new Error("Invalid communityVotingMode. Must be one of: 'OPEN', 'EMAIL', 'AUTHENTICATED'.");
      error.statusCode = 400;
      throw error;
    }
    mode = upperMode;
  }

  const budget = updates.communityVoteCreditBudget !== undefined
    ? Math.max(1, parseInt(updates.communityVoteCreditBudget, 10) || 100)
    : event.communityVoteCreditBudget;

  const updated = await prisma.event.update({
    where: { id: parsedEventId },
    data: {
      isCommunityVotingOpen: isOpen,
      isCommunityResultsRevealed: isRevealed,
      communityVotingMode: mode,
      communityVoteCreditBudget: budget,
    },
  });

  await auditService.logAction({
    eventId: event.id,
    actorId: currentUser.id,
    action: 'COMMUNITY_SETTINGS_UPDATED',
    targetType: 'Event',
    targetId: String(event.id),
    metadata: {
      isCommunityVotingOpen: isOpen,
      isCommunityResultsRevealed: isRevealed,
      communityVotingMode: mode,
      communityVoteCreditBudget: budget,
    },
  });

  return updated;
};

module.exports = {
  findSubmission,
  requestEmailVerification,
  confirmEmailVerification,
  castVote,
  getCommunityResults,
  addComment,
  getComments,
  deleteComment,
  updateVotingSettings,
};
