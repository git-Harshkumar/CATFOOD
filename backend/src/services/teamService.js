const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const generateInviteCode = () => {
  return 'TEAM-' + crypto.randomBytes(4).toString('hex').toUpperCase();
};

const createTeam = async (userId, { eventId, name }) => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId, 10) },
  });

  if (!event) {
    const error = new Error('Event not found.');
    error.statusCode = 404;
    throw error;
  }

  // Check if user is already in a team for this event
  const existingMembership = await prisma.teamMember.findFirst({
    where: {
      userId,
      team: { eventId: event.id },
    },
  });

  if (existingMembership) {
    const error = new Error('You are already a member of a team in this event.');
    error.statusCode = 400;
    throw error;
  }

  // Check unique team name in this event
  const existingTeam = await prisma.team.findUnique({
    where: {
      eventId_name: {
        eventId: event.id,
        name: name.trim(),
      },
    },
  });

  if (existingTeam) {
    const error = new Error(`A team named '${name}' already exists in this event.`);
    error.statusCode = 409;
    throw error;
  }

  let inviteCode = generateInviteCode();
  // Ensure uniqueness
  while (await prisma.team.findUnique({ where: { inviteCode } })) {
    inviteCode = generateInviteCode();
  }

  // Create team and add creator as leader and first member in transaction
  const team = await prisma.$transaction(async (tx) => {
    const newTeam = await tx.team.create({
      data: {
        eventId: event.id,
        name: name.trim(),
        inviteCode,
        leaderId: userId,
      },
    });

    await tx.teamMember.create({
      data: {
        teamId: newTeam.id,
        userId,
      },
    });

    await tx.eventMember.upsert({
      where: {
        eventId_userId: { eventId: event.id, userId }
      },
      update: {
        // If they already exist as something else, don't downgrade an organizer, but maybe ensure participant?
        // Actually, upsert update can be empty if we just want to ensure existence.
      },
      create: {
        eventId: event.id,
        userId,
        role: 'PARTICIPANT',
      }
    });

    return newTeam;
  });

  return getTeamById(team.id);
};

const joinTeam = async (userId, inviteCode) => {
  const team = await prisma.team.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
    include: {
      event: true,
      members: true,
    },
  });

  if (!team) {
    const error = new Error('Invalid invite code. Team not found.');
    error.statusCode = 404;
    throw error;
  }

  // Check if team is full
  if (team.members.length >= team.event.maxTeamSize) {
    const error = new Error(`Team is already full (maximum ${team.event.maxTeamSize} members allowed).`);
    error.statusCode = 400;
    throw error;
  }

  // Check if user is already in any team for this event
  const existingMembership = await prisma.teamMember.findFirst({
    where: {
      userId,
      team: { eventId: team.eventId },
    },
  });

  if (existingMembership) {
    const error = new Error('You are already a member of a team in this event.');
    error.statusCode = 400;
    throw error;
  }

  await prisma.$transaction([
    prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId,
      },
    }),
    prisma.eventMember.upsert({
      where: {
        eventId_userId: { eventId: team.eventId, userId }
      },
      update: {},
      create: {
        eventId: team.eventId,
        userId,
        role: 'PARTICIPANT',
      }
    })
  ]);

  return getTeamById(team.id);
};

const generateInviteLinkToken = async (teamId, userId) => {
  const team = await prisma.team.findUnique({
    where: { id: parseInt(teamId, 10) },
    include: { members: true },
  });

  if (!team) {
    const error = new Error('Team not found.');
    error.statusCode = 404;
    throw error;
  }

  // Only team leader can generate invite link (or any member, depending on requirements, let's say leader)
  if (team.leaderId !== userId) {
    const error = new Error('Only the team leader can generate invite links.');
    error.statusCode = 403;
    throw error;
  }

  const payload = {
    teamId: team.id,
    eventId: team.eventId,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  return token;
};

const joinTeamByToken = async (userId, token) => {
  if (!token) {
    const error = new Error('Invite token is required.');
    error.statusCode = 400;
    throw error;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    const error = new Error('Invalid or expired invite link.');
    error.statusCode = 401;
    throw error;
  }

  const team = await prisma.team.findUnique({
    where: { id: decoded.teamId },
    include: { event: true, members: true },
  });

  if (!team) {
    const error = new Error('Team not found.');
    error.statusCode = 404;
    throw error;
  }

  if (team.eventId !== decoded.eventId) {
    const error = new Error('Invalid token payload.');
    error.statusCode = 400;
    throw error;
  }

  // Check if team is full
  if (team.members.length >= team.event.maxTeamSize) {
    const error = new Error(`Team is already full (maximum ${team.event.maxTeamSize} members allowed).`);
    error.statusCode = 400;
    throw error;
  }

  // Check if user is already in any team for this event
  const existingMembership = await prisma.teamMember.findFirst({
    where: {
      userId,
      team: { eventId: team.eventId },
    },
  });

  if (existingMembership) {
    const error = new Error('You are already a member of a team in this event.');
    error.statusCode = 400;
    throw error;
  }

  await prisma.$transaction([
    prisma.teamMember.create({
      data: { teamId: team.id, userId },
    }),
    prisma.eventMember.upsert({
      where: { eventId_userId: { eventId: team.eventId, userId } },
      update: {},
      create: { eventId: team.eventId, userId, role: 'PARTICIPANT' }
    })
  ]);

  return getTeamById(team.id);
};

const completeRegistration = async (teamId, userId) => {
  const team = await prisma.team.findUnique({
    where: { id: parseInt(teamId, 10) },
    include: { members: true },
  });

  if (!team) {
    const error = new Error('Team not found.');
    error.statusCode = 404;
    throw error;
  }

  const isMember = team.members.some((m) => m.userId === userId) || team.leaderId === userId;
  if (!isMember) {
    const error = new Error('You must be a member of the team to complete registration.');
    error.statusCode = 403;
    throw error;
  }

  if (team.isRegistered) {
    const error = new Error('Team is already fully registered.');
    error.statusCode = 400;
    throw error;
  }

  await prisma.team.update({
    where: { id: team.id },
    data: { isRegistered: true },
  });

  return getTeamById(team.id);
};

const getTeamById = async (teamId) => {
  const team = await prisma.team.findUnique({
    where: { id: parseInt(teamId, 10) },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          deadline: true,
          status: true,
          minTeamSize: true,
          maxTeamSize: true,
        },
      },
      leader: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, isGlobalAdmin: true },
          },
        },
      },
      submission: true,
    },
  });

  if (!team) {
    const error = new Error('Team not found.');
    error.statusCode = 404;
    throw error;
  }

  return team;
};

const getMyTeams = async (userId) => {
  return prisma.team.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          deadline: true,
          status: true,
          isLeaderboardPublished: true,
        },
      },
      leader: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      submission: {
        select: { id: true, title: true, submittedAt: true },
      },
    },
  });
};

const leaveTeam = async (userId, teamId) => {
  const team = await prisma.team.findUnique({
    where: { id: parseInt(teamId, 10) },
    include: { members: true },
  });

  if (!team) {
    const error = new Error('Team not found.');
    error.statusCode = 404;
    throw error;
  }

  const membership = team.members.find((m) => m.userId === userId);
  if (!membership) {
    const error = new Error('You are not a member of this team.');
    error.statusCode = 403;
    throw error;
  }

  if (team.leaderId === userId && team.members.length > 1) {
    // If leader leaves but other members exist, transfer leadership to the next member
    const nextLeader = team.members.find((m) => m.userId !== userId);
    await prisma.$transaction([
      prisma.team.update({
        where: { id: team.id },
        data: { leaderId: nextLeader.userId },
      }),
      prisma.teamMember.delete({
        where: { id: membership.id },
      }),
    ]);
  } else if (team.members.length === 1) {
    // If lone member leaves, delete team
    await prisma.team.delete({
      where: { id: team.id },
    });
    return { deleted: true, message: 'Team disbanded.' };
  } else {
    await prisma.teamMember.delete({
      where: { id: membership.id },
    });
  }

  return { success: true, message: 'Left team successfully.' };
};

module.exports = {
  createTeam,
  joinTeam,
  joinTeamByToken,
  generateInviteLinkToken,
  getTeamById,
  getMyTeams,
  leaveTeam,
  completeRegistration,
};
