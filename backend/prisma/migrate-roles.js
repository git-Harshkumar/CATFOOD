const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(fs.readFileSync('./prisma/exported_data.json', 'utf8'));

  console.log('Migrating users...');
  for (const u of data.users) {
    await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        passwordHash: u.passwordHash,
        name: u.name,
        isGlobalAdmin: u.role === 'ADMIN',
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt)
      }
    });
  }

  console.log('Migrating events...');
  for (const e of data.events) {
    await prisma.event.create({
      data: {
        id: e.id,
        title: e.title,
        tagline: e.tagline,
        description: e.description,
        rules: e.rules,
        minTeamSize: e.minTeamSize,
        maxTeamSize: e.maxTeamSize,
        startDate: new Date(e.startDate),
        deadline: new Date(e.deadline),
        judgingDeadline: e.judgingDeadline ? new Date(e.judgingDeadline) : null,
        status: e.status,
        isLeaderboardPublished: e.isLeaderboardPublished,
        organizerId: e.organizerId,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt)
      }
    });

    await prisma.eventMember.create({
      data: {
        eventId: e.id,
        userId: e.organizerId,
        role: 'ORGANIZER'
      }
    });
  }

  console.log('Migrating criteria...');
  for (const c of data.criteria) {
    await prisma.criterion.create({
      data: {
        id: c.id,
        eventId: c.eventId,
        name: c.name,
        description: c.description,
        maxScore: c.maxScore,
        weight: c.weight,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt)
      }
    });
  }

  console.log('Migrating teams...');
  for (const t of data.teams) {
    await prisma.team.create({
      data: {
        id: t.id,
        eventId: t.eventId,
        name: t.name,
        inviteCode: t.inviteCode,
        leaderId: t.leaderId,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt)
      }
    });
  }

  for (const tm of data.teamMembers) {
    await prisma.teamMember.create({
      data: {
        id: tm.id,
        teamId: tm.teamId,
        userId: tm.userId,
        joinedAt: new Date(tm.joinedAt)
      }
    });

    const team = data.teams.find(t => t.id === tm.teamId);
    if (team) {
      try {
        await prisma.eventMember.create({
          data: {
            eventId: team.eventId,
            userId: tm.userId,
            role: 'PARTICIPANT'
          }
        });
      } catch (e) {
        // Ignore duplicate Participant roles
      }
    }
  }

  console.log('Migrating submissions...');
  for (const s of data.submissions) {
    await prisma.submission.create({
      data: {
        id: s.id,
        teamId: s.teamId,
        eventId: s.eventId,
        title: s.title,
        tagline: s.tagline,
        description: s.description,
        repoUrl: s.repoUrl,
        demoUrl: s.demoUrl,
        videoUrl: s.videoUrl,
        techStack: s.techStack,
        submittedAt: new Date(s.submittedAt),
        updatedAt: new Date(s.updatedAt)
      }
    });
  }

  console.log('Migrating judges...');
  for (const ja of data.judgeAssignments) {
    await prisma.judge.create({
      data: {
        eventId: ja.eventId,
        userId: ja.judgeId,
        status: 'ACCEPTED'
      }
    });

    try {
      await prisma.eventMember.create({
        data: {
          eventId: ja.eventId,
          userId: ja.judgeId,
          role: 'JUDGE'
        }
      });
    } catch (e) {}
  }

  console.log('Migrating scores...');
  for (const s of data.scores) {
    const sub = data.submissions.find(sub => sub.id === s.submissionId);
    if (!sub) continue;
    
    const judge = await prisma.judge.findUnique({
      where: {
        eventId_userId: {
          eventId: sub.eventId,
          userId: s.judgeId
        }
      }
    });

    if (judge) {
      await prisma.score.create({
        data: {
          id: s.id,
          submissionId: s.submissionId,
          judgeId: judge.id,
          criterionId: s.criterionId,
          score: s.score,
          feedback: s.feedback,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt)
        }
      });
    }
  }

  console.log('Data migration complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
