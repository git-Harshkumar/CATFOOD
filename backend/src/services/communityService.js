const prisma = require('../utils/prisma');

// Simple in-memory sliding window rate limiter for IP voting: ip -> array of timestamps
const ipVoteHistory = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_VOTES_PER_IP = 30;

const checkIpRateLimit = (ip) => {
  if (!ip) return;
  const now = Date.now();
  const history = ipVoteHistory.get(ip) || [];
  const recent = history.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_VOTES_PER_IP) {
    const error = new Error('Rate limit exceeded: Too many votes cast from this IP address. Please try again later.');
    error.statusCode = 429;
    throw error;
  }
  recent.push(now);
  ipVoteHistory.set(ip, recent);
};

const castVote = async ({ eventId, submissionId, voterEmail, voterIp, currentUser }) => {
  const email = (currentUser?.email || voterEmail || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    const error = new Error('Valid email address is required to cast a community vote.');
    error.statusCode = 400;
    throw error;
  }

  const subId = parseInt(submissionId, 10);
  const submission = await prisma.submission.findUnique({
    where: { id: subId },
    include: { event: true },
  });

  if (!submission) {
    const error = new Error('Submission not found.');
    error.statusCode = 404;
    throw error;
  }

  const event = submission.event;
  if (!event.isCommunityVotingOpen) {
    const error = new Error('Community voting is currently closed for this event.');
    error.statusCode = 403;
    throw error;
  }

  checkIpRateLimit(voterIp);

  // Check duplicate vote for this project
  const existingVote = await prisma.communityVote.findUnique({
    where: {
      submissionId_voterEmail: {
        submissionId: subId,
        voterEmail: email,
      },
    },
  });

  if (existingVote) {
    const error = new Error('You have already cast a vote for this project.');
    error.statusCode = 409;
    throw error;
  }

  const vote = await prisma.communityVote.create({
    data: {
      eventId: event.id,
      submissionId: subId,
      voterEmail: email,
      voterIp: voterIp || null,
    },
  });

  return {
    success: true,
    voteId: vote.id,
    submissionId: subId,
    projectTitle: submission.title,
    message: 'Your vote has been counted!',
  };
};

const getCommunityResults = async (eventId, currentUser) => {
  const parsedEventId = parseInt(eventId, 10);
  const event = await prisma.event.findUnique({
    where: { id: parsedEventId },
    include: {
      submissions: {
        where: { status: 'SUBMITTED' },
        include: {
          team: { select: { id: true, name: true } },
          track: true,
          _count: { select: { communityVotes: true } },
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
  const isRevealed = event.isCommunityResultsRevealed;

  // T3 requirement: hide results during the voting window until organizer reveals
  if (!isRevealed && !isOrganizer) {
    return {
      eventId: event.id,
      eventTitle: event.title,
      isCommunityVotingOpen: event.isCommunityVotingOpen,
      isCommunityResultsRevealed: false,
      message: 'Community voting results are sealed until the voting window concludes.',
      submissionsCount: event.submissions.length,
    };
  }

  const standings = event.submissions.map((s) => ({
    submissionId: s.id,
    title: s.title,
    teamName: s.team?.name || 'Unknown',
    trackName: s.track?.name || 'General',
    voteCount: s._count.communityVotes,
  }));

  standings.sort((a, b) => b.voteCount - a.voteCount);
  standings.forEach((item, index) => {
    item.rank = index + 1;
  });

  return {
    eventId: event.id,
    eventTitle: event.title,
    isCommunityVotingOpen: event.isCommunityVotingOpen,
    isCommunityResultsRevealed: true,
    totalVotes: standings.reduce((sum, s) => sum + s.voteCount, 0),
    standings,
  };
};

const addComment = async ({ submissionId, authorName, authorEmail, content, currentUser }) => {
  const subId = parseInt(submissionId, 10);
  const submission = await prisma.submission.findUnique({
    where: { id: subId },
  });

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

  const name = (currentUser?.name || authorName || 'Anonymous Community Member').trim();
  const email = (currentUser?.email || authorEmail || 'community@example.org').trim().toLowerCase();

  const comment = await prisma.comment.create({
    data: {
      submissionId: subId,
      authorName: name,
      authorEmail: email,
      content: cleanContent,
    },
  });

  return comment;
};

const getComments = async (submissionId) => {
  const subId = parseInt(submissionId, 10);
  const comments = await prisma.comment.findMany({
    where: { submissionId: subId },
    orderBy: { createdAt: 'desc' },
  });
  return comments;
};

const updateVotingSettings = async (eventId, { isCommunityVotingOpen, isCommunityResultsRevealed }, currentUser) => {
  const parsedEventId = parseInt(eventId, 10);
  const event = await prisma.event.findUnique({ where: { id: parsedEventId } });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  const isOrganizer = currentUser?.isGlobalAdmin || event.organizerId === currentUser?.id;
  if (!isOrganizer) {
    const error = new Error('Forbidden. Only organizers can adjust community voting settings.');
    error.statusCode = 403;
    throw error;
  }

  const updated = await prisma.event.update({
    where: { id: parsedEventId },
    data: {
      isCommunityVotingOpen: isCommunityVotingOpen !== undefined ? Boolean(isCommunityVotingOpen) : event.isCommunityVotingOpen,
      isCommunityResultsRevealed: isCommunityResultsRevealed !== undefined ? Boolean(isCommunityResultsRevealed) : event.isCommunityResultsRevealed,
    },
  });

  return updated;
};

module.exports = {
  castVote,
  getCommunityResults,
  addComment,
  getComments,
  updateVotingSettings,
};
