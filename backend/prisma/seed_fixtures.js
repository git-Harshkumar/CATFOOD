const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed Fixtures] Clearing existing data...');
  await prisma.submissionAnswer.deleteMany();
  await prisma.score.deleteMany();
  await prisma.normalizedScore.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.judgeAssignment.deleteMany();
  await prisma.judgeTrack.deleteMany();
  await prisma.judge.deleteMany();
  await prisma.criterion.deleteMany();
  await prisma.prize.deleteMany();
  await prisma.eventQuestion.deleteMany();
  await prisma.track.deleteMany();
  await prisma.eventMember.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  console.log('[Seed Fixtures] Adding explicit auth users for .dogfood.toml...');
  const organizer = await prisma.user.create({
    data: {
      id: 376,
      email: 'organizer@hack.com',
      name: 'Sarah Connor (Organizer)',
      isGlobalAdmin: false,
      passwordHash: defaultPasswordHash,
    },
  });

  const judgeA = await prisma.user.create({
    data: {
      id: 385,
      email: 'ada@example.org',
      name: 'Ada Okonkwo',
      passwordHash: defaultPasswordHash,
    },
  });

  const judgeB = await prisma.user.create({
    data: {
      id: 386,
      email: 'marcus.v@example.org',
      name: 'Marcus Vance',
      passwordHash: defaultPasswordHash,
    },
  });

  const participant = await prisma.user.create({
    data: {
      id: 415,
      email: 'participant@hack.com',
      name: 'Participant (Participant)',
      passwordHash: defaultPasswordHash,
    },
  });

  console.log('[Seed Fixtures] Loading fixtures.json...');
  const fixturesPath = path.resolve(__dirname, '../../fixtures.json');
  const fixturesData = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

  const activeEvent = await prisma.event.create({
    data: {
      id: 1,
      title: fixturesData.event.name,
      description: 'Loaded from fixtures',
      startDate: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000), // past
      deadline: new Date(fixturesData.event.submissions_close),
      organizerId: organizer.id,
    }
  });

  await prisma.eventMember.createMany({
    data: [
      { eventId: activeEvent.id, userId: organizer.id, role: 'ORGANIZER' },
      { eventId: activeEvent.id, userId: judgeA.id, role: 'JUDGE' },
      { eventId: activeEvent.id, userId: judgeB.id, role: 'JUDGE' },
      { eventId: activeEvent.id, userId: participant.id, role: 'PARTICIPANT' },
    ]
  });

  await prisma.judge.createMany({
    data: [
      { eventId: activeEvent.id, userId: judgeA.id, status: 'ACCEPTED' },
      { eventId: activeEvent.id, userId: judgeB.id, status: 'ACCEPTED' },
    ]
  });

  console.log('[Seed Fixtures] Loading projects...');
  let i = 0;
  for (const project of fixturesData.projects || []) {
    i++;
    // We just create dummy teams for the projects
    const team = await prisma.team.create({
      data: {
        eventId: activeEvent.id,
        name: project.title + ' Team ' + i,
        inviteCode: 'TEAM-' + i + '-' + project.title.replace(/\s+/g, ''),
        leaderId: participant.id,
      }
    });

    await prisma.submission.create({
      data: {
        eventId: activeEvent.id,
        teamId: team.id,
        status: 'SUBMITTED',
        title: project.title,
        description: project.description || 'Description for ' + project.title,
      }
    });
  }

  // To make judge sees own scores pass, judgeA needs to have a score.
  // Wait, does getJudgeScores just return [] and that's considered 200 OK?
  // Let's create a score for judgeA anyway.
  const sub = await prisma.submission.findFirst();
  const criterion = await prisma.criterion.create({
    data: {
      eventId: activeEvent.id,
      name: 'Fixture Criterion',
    }
  });

  const jA = await prisma.judge.findFirst({ where: { userId: judgeA.id } });
  if (sub && jA) {
    await prisma.score.create({
      data: {
        submissionId: sub.id,
        judgeId: jA.id,
        criterionId: criterion.id,
        score: 8,
      }
    });
  }
  
  console.log('[Seed Fixtures] Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
