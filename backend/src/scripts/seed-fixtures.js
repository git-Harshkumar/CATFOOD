const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { generateToken } = require('../utils/jwt');
const judgingService = require('../services/judgingService');

async function main() {
  console.log('[Seed-Fixtures] Starting fixture loading...');

  // Locate fixtures.json
  const candidatePaths = [
    path.resolve(__dirname, '../../../fixtures.json'),
    path.resolve(__dirname, '../../../tests/fixtures.json'),
    path.resolve(process.cwd(), 'fixtures.json'),
    path.resolve(process.cwd(), 'tests/fixtures.json'),
  ];

  let fixturePath = candidatePaths.find((p) => fs.existsSync(p));
  if (!fixturePath) {
    throw new Error('fixtures.json could not be found in workspace.');
  }

  console.log(`[Seed-Fixtures] Loading fixtures from: ${fixturePath}`);
  const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  // 1. Wipe DB in proper foreign key order
  console.log('[Seed-Fixtures] Wiping database...');
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

  // 2. Create Organizer
  console.log('[Seed-Fixtures] Creating organizer and demo test users...');
  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@hack.com',
      name: 'Sarah Connor (Organizer)',
      isGlobalAdmin: false,
      passwordHash: defaultPasswordHash,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@hack.com',
      name: 'Super Admin',
      isGlobalAdmin: true,
      passwordHash: defaultPasswordHash,
    },
  });

  const demoJudges = [
    { email: 'judge1@hack.com', name: 'Dr. Alan Turing (Judge 1)' },
    { email: 'judge2@hack.com', name: 'Ada Lovelace (Judge 2)' },
    { email: 'judge3@hack.com', name: 'Grace Hopper (Judge 3)' },
    { email: 'judge4@hack.com', name: 'Claude Shannon (Judge 4)' },
  ];

  for (const dj of demoJudges) {
    await prisma.user.create({
      data: {
        email: dj.email,
        name: dj.name,
        isGlobalAdmin: false,
        passwordHash: defaultPasswordHash,
      },
    });
  }

  const demoParticipants = [
    { email: 'alice@hack.com', name: 'Alice Johnson' },
    { email: 'bob@hack.com', name: 'Bob Smith' },
    { email: 'charlie@hack.com', name: 'Charlie Brown' },
  ];

  for (const dp of demoParticipants) {
    await prisma.user.create({
      data: {
        email: dp.email,
        name: dp.name,
        isGlobalAdmin: false,
        passwordHash: defaultPasswordHash,
      },
    });
  }

  // 3. Create Event from fixture
  console.log('[Seed-Fixtures] Creating event:', fixtures.event.name);
  const event = await prisma.event.create({
    data: {
      title: fixtures.event.name,
      tagline: 'Official DOGFOOD 2026 Hackathon Portal',
      description: 'Production submission and judging platform with rigorous RBAC, cross-judge normalization, and deadline enforcement.',
      rules: 'Standard hackathon rules apply. Submissions close strictly at deadline.',
      minTeamSize: 1,
      maxTeamSize: 4,
      startDate: new Date('2026-02-25T00:00:00Z'),
      deadline: new Date(fixtures.event.submissions_close),
      judgingDeadline: new Date('2026-03-05T18:00:00Z'),
      status: 'ACTIVE',
      isLeaderboardPublished: true,
      organizerId: organizer.id,
    },
  });

  await prisma.eventMember.create({
    data: {
      eventId: event.id,
      userId: organizer.id,
      role: 'ORGANIZER',
    },
  });

  // 4. Create Standard Criteria
  console.log('[Seed-Fixtures] Creating rubric criteria...');
  const criteriaDefs = [
    { name: 'Functionality', description: 'Working prototype and technical execution', maxScore: 5, weight: 1.0, key: 'functionality' },
    { name: 'Quality', description: 'Code quality, stability, and polish', maxScore: 5, weight: 1.0, key: 'quality' },
    { name: 'Innovation', description: 'Creativity, originality, and novelty', maxScore: 5, weight: 1.0, key: 'innovation' },
    { name: 'Design / UX', description: 'User experience and intuitive UI design', maxScore: 5, weight: 0.8, key: 'design' },
  ];

  const criteriaMap = {};
  for (const c of criteriaDefs) {
    const record = await prisma.criterion.create({
      data: {
        eventId: event.id,
        name: c.name,
        description: c.description,
        maxScore: c.maxScore,
        weight: c.weight,
      },
    });
    criteriaMap[c.key] = record;
  }

  // 5. Create Tracks
  console.log(`[Seed-Fixtures] Creating ${fixtures.tracks.length} tracks...`);
  const trackMap = {};
  for (const t of fixtures.tracks) {
    const record = await prisma.track.create({
      data: {
        eventId: event.id,
        name: t.name,
        description: `Track for ${t.name} projects`,
      },
    });
    trackMap[t.id] = record;
  }

  // 6. Create Judges
  console.log(`[Seed-Fixtures] Creating ${fixtures.judges.length} judges...`);
  const judgeMap = {};
  for (const j of fixtures.judges) {
    let user = await prisma.user.findUnique({ where: { email: j.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: j.email,
          name: j.name,
          passwordHash: defaultPasswordHash,
          isGlobalAdmin: false,
        },
      });
    }

    await prisma.eventMember.create({
      data: {
        eventId: event.id,
        userId: user.id,
        role: 'JUDGE',
      },
    });

    const judgeRecord = await prisma.judge.create({
      data: {
        eventId: event.id,
        userId: user.id,
        status: 'CONFIRMED',
      },
    });

    // Link assigned tracks
    if (j.tracks && Array.isArray(j.tracks)) {
      for (const trkId of j.tracks) {
        if (trackMap[trkId]) {
          await prisma.judgeTrack.create({
            data: {
              judgeId: judgeRecord.id,
              trackId: trackMap[trkId].id,
            },
          });
        }
      }
    }

    judgeMap[j.id] = {
      judgeId: judgeRecord.id,
      userId: user.id,
      user,
    };
  }

  // 7. Create Teams & Participants
  console.log(`[Seed-Fixtures] Creating ${fixtures.teams.length} teams...`);
  const teamMap = {};
  let participantUser = null;

  for (const tm of fixtures.teams) {
    const memberUsers = [];
    for (const email of tm.members) {
      let u = await prisma.user.findUnique({ where: { email } });
      if (!u) {
        const namePart = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ');
        const name = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        u = await prisma.user.create({
          data: {
            email,
            name: `${name} (Participant)`,
            passwordHash: defaultPasswordHash,
            isGlobalAdmin: false,
          },
        });
      }
      memberUsers.push(u);

      if (email === 'participant@hack.com' || (!participantUser && email !== 'ada@example.org')) {
        participantUser = u;
      }
    }

    const leader = memberUsers[0];
    const teamRecord = await prisma.team.create({
      data: {
        eventId: event.id,
        name: tm.name,
        inviteCode: `INV-${tm.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        leaderId: leader.id,
        isRegistered: true,
      },
    });

    for (const mu of memberUsers) {
      await prisma.teamMember.create({
        data: {
          teamId: teamRecord.id,
          userId: mu.id,
        },
      });

      const existingMember = await prisma.eventMember.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: mu.id } },
      });
      if (!existingMember) {
        await prisma.eventMember.create({
          data: {
            eventId: event.id,
            userId: mu.id,
            role: 'PARTICIPANT',
          },
        });
      }
    }

    teamMap[tm.id] = teamRecord;
  }

  // Ensure dedicated participant user exists
  if (!participantUser) {
    participantUser = await prisma.user.create({
      data: {
        email: 'participant@hack.com',
        name: 'Demo Participant',
        passwordHash: defaultPasswordHash,
        isGlobalAdmin: false,
      },
    });
  }

  // 8. Create Projects
  console.log(`[Seed-Fixtures] Creating ${fixtures.projects.length} submissions...`);
  const projectMap = {};
  for (const prj of fixtures.projects) {
    const teamRecord = teamMap[prj.team];
    const trackRecord = trackMap[prj.track];

    const submission = await prisma.submission.create({
      data: {
        eventId: event.id,
        teamId: teamRecord.id,
        trackId: trackRecord ? trackRecord.id : null,
        title: prj.title,
        tagline: prj.summary,
        description: `${prj.summary}\n\nComprehensive technical documentation and architecture for ${prj.title}. Includes full repository, integration tests, and responsive frontend.`,
        repoUrl: prj.repo_url || `https://example.org/repo/${prj.id}`,
        demoUrl: `https://${prj.id}.demo.example.org`,
        techStack: 'Node.js, Express, React, SQLite, Prisma',
        status: 'SUBMITTED',
        submittedAt: new Date(prj.submitted_at || '2026-02-28T20:00:00Z'),
      },
    });
    projectMap[prj.id] = submission;
  }

  // 9. Create Judge Scores & Assignments
  console.log(`[Seed-Fixtures] Creating ${fixtures.scores.length} score entries...`);
  const assignmentKeySet = new Set();

  for (const sc of fixtures.scores) {
    const judgeObj = judgeMap[sc.judge];
    const subRecord = projectMap[sc.project];
    if (!judgeObj || !subRecord) continue;

    const assignKey = `${judgeObj.judgeId}_${subRecord.id}`;
    if (!assignmentKeySet.has(assignKey)) {
      await prisma.judgeAssignment.create({
        data: {
          judgeId: judgeObj.judgeId,
          submissionId: subRecord.id,
          status: 'COMPLETED',
        },
      });
      assignmentKeySet.add(assignKey);
    }

    for (const [critKey, scoreVal] of Object.entries(sc.criteria)) {
      const crit = criteriaMap[critKey] || criteriaMap['functionality'];
      if (!crit) continue;

      await prisma.score.create({
        data: {
          submissionId: subRecord.id,
          judgeId: judgeObj.judgeId,
          criterionId: crit.id,
          score: Number(scoreVal),
          feedback: sc.comment || 'Evaluated',
        },
      });
    }
  }

  // 10. Run Normalization
  console.log('[Seed-Fixtures] Running cross-judge normalization...');
  await judgingService.runEventNormalization(event.id, organizer.id);

  // 11. Generate Persistent Authentication Tokens
  const tokenOrg = generateToken({
    id: organizer.id,
    email: organizer.email,
    name: organizer.name,
    role: 'ORGANIZER',
    isGlobalAdmin: false,
  });

  const judgeAUser = judgeMap['jdg_01']?.user;
  const tokenJudgeA = generateToken({
    id: judgeAUser.id,
    email: judgeAUser.email,
    name: judgeAUser.name,
    role: 'JUDGE',
    isGlobalAdmin: false,
  });

  const judgeBUser = judgeMap['jdg_02']?.user;
  const tokenJudgeB = generateToken({
    id: judgeBUser.id,
    email: judgeBUser.email,
    name: judgeBUser.name,
    role: 'JUDGE',
    isGlobalAdmin: false,
  });

  const tokenParticipant = generateToken({
    id: participantUser.id,
    email: participantUser.email,
    name: participantUser.name,
    role: 'PARTICIPANT',
    isGlobalAdmin: false,
  });

  console.log('\nseeded. test logins:');
  console.log(`  organizer    Authorization: Bearer ${tokenOrg}`);
  console.log(`  judge_a      Authorization: Bearer ${tokenJudgeA}`);
  console.log(`  judge_b      Authorization: Bearer ${tokenJudgeB}`);
  console.log(`  participant  Authorization: Bearer ${tokenParticipant}`);

  // 12. Update .dogfood.toml with current tokens and routes
  const tomlContent = `# DOGFOOD 2026 Acceptance Checker Configuration

[portal]
base_url = "http://localhost:8080"

[tiers]
claimed = ["T1", "T2", "T3", "T4"]
pitch = "A production-grade, mathematically defensible hackathon submission and judging engine with strict RBAC, cross-judge z-score normalization, Bradley-Terry pairwise voting, and offline zero-dependency architecture."

[auth]
organizer   = "Authorization: Bearer ${tokenOrg}"
judge_a     = "Authorization: Bearer ${tokenJudgeA}"
judge_b     = "Authorization: Bearer ${tokenJudgeB}"
participant = "Authorization: Bearer ${tokenParticipant}"

[routes]
gallery      = "/projects"
submit       = "/projects/new"
judge_scores = "/api/judge/scores"
peer_scores  = "/api/judge/scores?judge=judge_a"
csv_export   = "/api/organizer/judging/export.csv"
`;

  const tomlPath = path.resolve(__dirname, '../../../.dogfood.toml');
  fs.writeFileSync(tomlPath, tomlContent);
  console.log(`[Seed-Fixtures] Successfully updated .dogfood.toml at ${tomlPath}`);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('[Seed-Fixtures] Error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = main;
