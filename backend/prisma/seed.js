const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const judgingEngine = require('../src/services/judgingEngine');

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Clearing existing data...');
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

  console.log('[Seed] Creating demo users...');
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

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

  // Judges with different scoring tendencies
  const judgeUser1 = await prisma.user.create({
    data: {
      email: 'judge1@hack.com',
      name: 'Dr. Alan Turing (Balanced Judge)',
      passwordHash: defaultPasswordHash,
    },
  });

  const judgeUser2 = await prisma.user.create({
    data: {
      email: 'judge2@hack.com',
      name: 'Ada Lovelace (Generous Judge)',
      passwordHash: defaultPasswordHash,
    },
  });

  const judgeUser3 = await prisma.user.create({
    data: {
      email: 'judge3@hack.com',
      name: 'Admiral Grace Hopper (Strict Judge)',
      passwordHash: defaultPasswordHash,
    },
  });

  const judgeUser4 = await prisma.user.create({
    data: {
      email: 'judge4@hack.com',
      name: 'Claude Shannon (Uniform Judge)',
      passwordHash: defaultPasswordHash,
    },
  });

  const participant1 = await prisma.user.create({
    data: {
      email: 'alice@hack.com',
      name: 'Alice Johnson',
      passwordHash: defaultPasswordHash,
    },
  });

  const participant2 = await prisma.user.create({
    data: {
      email: 'bob@hack.com',
      name: 'Bob Smith',
      passwordHash: defaultPasswordHash,
    },
  });

  const participant3 = await prisma.user.create({
    data: {
      email: 'charlie@hack.com',
      name: 'Charlie Brown',
      passwordHash: defaultPasswordHash,
    },
  });

  const participant4 = await prisma.user.create({
    data: {
      email: 'dana@hack.com',
      name: 'Dana Scully',
      passwordHash: defaultPasswordHash,
    },
  });

  console.log('[Seed] Creating active hackathon event...');
  const now = new Date();
  const futureDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const pastStartDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const activeEvent = await prisma.event.create({
    data: {
      title: 'Global AI & Cloud Hackathon 2026',
      tagline: 'Build next-generation intelligent applications for real-world impact',
      description: 'Join 500+ developers worldwide in building state-of-the-art AI, developer tools, and cloud platforms.',
      rules: '1. All code must be written during the hackathon.\n2. Submit deliverables before deadline.',
      minTeamSize: 1,
      maxTeamSize: 4,
      startDate: pastStartDate,
      deadline: futureDeadline,
      status: 'ACTIVE',
      isLeaderboardPublished: false,
      organizerId: organizer.id,
      members: {
        create: [
          { userId: organizer.id, role: 'ORGANIZER' },
          { userId: participant1.id, role: 'PARTICIPANT' },
          { userId: participant2.id, role: 'PARTICIPANT' },
          { userId: participant3.id, role: 'PARTICIPANT' },
          { userId: participant4.id, role: 'PARTICIPANT' },
          { userId: judgeUser1.id, role: 'JUDGE' },
          { userId: judgeUser2.id, role: 'JUDGE' },
          { userId: judgeUser3.id, role: 'JUDGE' },
          { userId: judgeUser4.id, role: 'JUDGE' },
        ],
      },
      criteria: {
        create: [
          { name: 'Innovation & Novelty', maxScore: 10, weight: 1.2 },
          { name: 'Technical Depth', maxScore: 10, weight: 1.0 },
          { name: 'UI / UX Design', maxScore: 10, weight: 0.8 },
        ],
      },
      prizes: {
        create: [
          { name: 'Grand Prize', description: 'Best overall hack', value: '$5000' },
          { name: 'Runner Up', description: 'Second best overall hack', value: '$2500' },
        ],
      },
      questions: {
        create: [
          { question: 'What inspired your project?', isRequired: true, order: 1 },
          { question: 'What was the hardest technical challenge you faced?', isRequired: true, order: 2 },
        ],
      },
      tracks: {
        create: [
          { name: 'Artificial Intelligence', description: 'Best use of AI models and agentic workflows' },
          { name: 'Cloud Infrastructure', description: 'Best cloud-native distributed architecture' },
        ],
      },
      judges: {
        create: [
          { userId: judgeUser1.id, status: 'ACCEPTED' },
          { userId: judgeUser2.id, status: 'ACCEPTED' },
          { userId: judgeUser3.id, status: 'ACCEPTED' },
          { userId: judgeUser4.id, status: 'ACCEPTED' },
        ],
      },
    },
    include: { criteria: true, tracks: true, questions: true, judges: true },
  });

  const aiTrack = activeEvent.tracks.find((t) => t.name === 'Artificial Intelligence');
  const cloudTrack = activeEvent.tracks.find((t) => t.name === 'Cloud Infrastructure');

  const judge1 = activeEvent.judges.find((j) => j.userId === judgeUser1.id);
  const judge2 = activeEvent.judges.find((j) => j.userId === judgeUser2.id);
  const judge3 = activeEvent.judges.find((j) => j.userId === judgeUser3.id);
  const judge4 = activeEvent.judges.find((j) => j.userId === judgeUser4.id);

  // Assign JudgeTracks:
  // Judge 1 -> AI Track
  // Judge 2 -> Cloud Track
  // Judge 3 -> Both Tracks
  // Judge 4 -> Both Tracks
  await prisma.judgeTrack.createMany({
    data: [
      { judgeId: judge1.id, trackId: aiTrack.id },
      { judgeId: judge2.id, trackId: cloudTrack.id },
      { judgeId: judge3.id, trackId: aiTrack.id },
      { judgeId: judge3.id, trackId: cloudTrack.id },
      { judgeId: judge4.id, trackId: aiTrack.id },
      { judgeId: judge4.id, trackId: cloudTrack.id },
    ],
  });

  console.log('[Seed] Creating teams for active event...');
  const team1 = await prisma.team.create({
    data: {
      eventId: activeEvent.id,
      name: 'NeuralPulse',
      inviteCode: 'TEAM-NP01',
      leaderId: participant1.id,
      members: {
        create: [{ userId: participant1.id }, { userId: participant2.id }],
      },
    },
  });

  const team2 = await prisma.team.create({
    data: {
      eventId: activeEvent.id,
      name: 'QuantumLeap',
      inviteCode: 'TEAM-QL02',
      leaderId: participant3.id,
      members: {
        create: [{ userId: participant3.id }, { userId: participant4.id }],
      },
    },
  });

  console.log('[Seed] Creating submissions...');
  const sub1 = await prisma.submission.create({
    data: {
      eventId: activeEvent.id,
      teamId: team1.id,
      status: 'SUBMITTED',
      title: 'NeuralPulse: Realtime Autonomous Medical Diagnostics',
      tagline: 'AI copilot for emergency room triage',
      description: 'NeuralPulse processes multimodal clinical telemetry with edge-accelerated models.',
      thumbnailUrl: 'https://via.placeholder.com/800x450.png?text=NeuralPulse+Thumbnail',
      imageGallery: JSON.stringify([
        'https://via.placeholder.com/800x450.png?text=Gallery+1',
        'https://via.placeholder.com/800x450.png?text=Gallery+2',
      ]),
      repoUrl: 'https://github.com/neuralpulse/hackathon-2026',
      demoUrl: 'https://neuralpulse.demo.app',
      videoUrl: 'https://youtube.com/watch?v=sample1',
      techStack: 'React, Vite, Node.js, PyTorch',
      trackId: aiTrack.id,
      answers: {
        create: [
          { questionId: activeEvent.questions[0].id, answer: 'We saw a need in hospitals.' },
          { questionId: activeEvent.questions[1].id, answer: 'Getting PyTorch to run fast on Edge.' },
        ],
      },
    },
  });

  const sub2 = await prisma.submission.create({
    data: {
      eventId: activeEvent.id,
      teamId: team2.id,
      status: 'SUBMITTED',
      title: 'QuantumLeap: Zero-Knowledge Supply Chain Traceability',
      tagline: 'Cryptographically verifiable carbon accounting',
      description: 'QuantumLeap allows global enterprise manufacturers to prove net-zero compliance.',
      thumbnailUrl: 'https://via.placeholder.com/800x450.png?text=QuantumLeap+Thumbnail',
      imageGallery: JSON.stringify([]),
      repoUrl: 'https://github.com/quantumleap/hackathon-2026',
      techStack: 'Next.js, Express, Circom',
      trackId: cloudTrack.id,
    },
  });

  console.log('[Seed] Creating judge assignments...');
  // Project 1 (AI Track): assigned to Judge 1, Judge 3, Judge 4
  await prisma.judgeAssignment.createMany({
    data: [
      { judgeId: judge1.id, submissionId: sub1.id, trackId: aiTrack.id, batch: 'batch_alpha', status: 'COMPLETED' },
      { judgeId: judge3.id, submissionId: sub1.id, trackId: aiTrack.id, batch: 'batch_alpha', status: 'COMPLETED' },
      { judgeId: judge4.id, submissionId: sub1.id, trackId: aiTrack.id, batch: 'batch_alpha', status: 'COMPLETED' },
    ],
  });

  // Project 2 (Cloud Track): assigned to Judge 2, Judge 3 (Judge 2 completed, Judge 3 pending)
  await prisma.judgeAssignment.createMany({
    data: [
      { judgeId: judge2.id, submissionId: sub2.id, trackId: cloudTrack.id, batch: 'batch_beta', status: 'COMPLETED' },
      { judgeId: judge3.id, submissionId: sub2.id, trackId: cloudTrack.id, batch: 'batch_beta', status: 'PENDING' },
    ],
  });

  console.log('[Seed] Creating judge scores showcasing different scoring behaviors...');
  const criteria = activeEvent.criteria;

  // Judge 1 (Balanced): sub1 scores around 8
  for (const crit of criteria) {
    await prisma.score.create({
      data: {
        submissionId: sub1.id,
        judgeId: judge1.id,
        criterionId: crit.id,
        score: crit.name.includes('UI') ? 7 : 8,
        feedback: 'Solid implementation and clear vision.',
      },
    });
  }

  // Judge 3 (Strict): sub1 scores around 5
  for (const crit of criteria) {
    await prisma.score.create({
      data: {
        submissionId: sub1.id,
        judgeId: judge3.id,
        criterionId: crit.id,
        score: 5,
        feedback: 'Good architecture but lacks comprehensive test coverage.',
      },
    });
  }

  // Judge 4 (Uniform): sub1 scores exactly 7 on everything
  for (const crit of criteria) {
    await prisma.score.create({
      data: {
        submissionId: sub1.id,
        judgeId: judge4.id,
        criterionId: crit.id,
        score: 7,
        feedback: 'Consistent standard evaluation.',
      },
    });
  }

  // Judge 2 (Generous): sub2 scores 9.5
  for (const crit of criteria) {
    await prisma.score.create({
      data: {
        submissionId: sub2.id,
        judgeId: judge2.id,
        criterionId: crit.id,
        score: 9.5,
        feedback: 'Phenomenal cryptographic design and live demo.',
      },
    });
  }

  console.log('[Seed] Populating initial normalized scores...');
  const allSubmissions = [sub1, sub2];
  const allScores = await prisma.score.findMany({
    where: { submission: { eventId: activeEvent.id } },
  });

  const rawEvals = [];
  for (const sub of allSubmissions) {
    const subScores = allScores.filter((s) => s.submissionId === sub.id);
    const byJudge = new Map();
    subScores.forEach((s) => {
      if (!byJudge.has(s.judgeId)) byJudge.set(s.judgeId, []);
      byJudge.get(s.judgeId).push(s);
    });

    for (const [judgeId, jScores] of byJudge.entries()) {
      const calc = judgingEngine.calculateWeightedScore(jScores, criteria);
      rawEvals.push({
        judgeId,
        submissionId: sub.id,
        rawScore: calc.totalWeightedScore,
        maxPossible: calc.totalMaxPossible,
      });
    }
  }

  const { normalizedScores } = judgingEngine.normalizeScores(rawEvals);
  if (normalizedScores.length > 0) {
    await prisma.normalizedScore.createMany({
      data: normalizedScores.map((ns) => ({
        eventId: activeEvent.id,
        submissionId: ns.submissionId,
        judgeId: ns.judgeId,
        rawScore: ns.rawScore,
        normalizedScore: ns.normalizedScore,
        metadata: JSON.stringify(ns.metadata),
      })),
    });
  }

  console.log('[Seed] Recording audit trail entries...');
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: organizer.id,
        action: 'JUDGE_INVITED',
        targetType: 'Event',
        targetId: String(activeEvent.id),
        metadata: JSON.stringify({ judgesCount: 4 }),
      },
      {
        actorId: organizer.id,
        action: 'JUDGE_BATCH_ASSIGNED',
        targetType: 'Event',
        targetId: String(activeEvent.id),
        metadata: JSON.stringify({ batch: 'batch_alpha', count: 3 }),
      },
      {
        actorId: judgeUser1.id,
        action: 'SCORE_SUBMITTED',
        targetType: 'Submission',
        targetId: String(sub1.id),
        metadata: JSON.stringify({ score: '8.0' }),
      },
      {
        actorId: organizer.id,
        action: 'NORMALIZATION_EXECUTED',
        targetType: 'Event',
        targetId: String(activeEvent.id),
        metadata: JSON.stringify({ totalNormalized: normalizedScores.length }),
      },
    ],
  });

  console.log('[Seed] Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
