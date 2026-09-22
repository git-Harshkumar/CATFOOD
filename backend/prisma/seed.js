const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Clearing existing data...');
  await prisma.submissionAnswer.deleteMany();
  await prisma.score.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.judgeAssignment.deleteMany();
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

  const judgeUser1 = await prisma.user.create({
    data: {
      email: 'judge1@hack.com',
      name: 'Dr. Alan Turing (Judge)',
      passwordHash: defaultPasswordHash,
    },
  });

  const judgeUser2 = await prisma.user.create({
    data: {
      email: 'judge2@hack.com',
      name: 'Ada Lovelace (Judge)',
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
  const futureDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days in future
  const pastStartDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

  const activeEvent = await prisma.event.create({
    data: {
      title: 'Global AI & Cloud Hackathon 2026',
      tagline: 'Build next-generation intelligent applications for real-world impact',
      description: 'Join 500+ developers worldwide in building state-of-the-art AI, developer tools, and cloud platforms.',
      rules: '1. All code must be written during the hackathon.',
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
        ]
      },
      tracks: {
        create: [
          { name: 'Artificial Intelligence', description: 'Best use of AI models' },
          { name: 'Cloud Infrastructure', description: 'Best cloud-native app' },
        ]
      },
      judges: {
        create: [
          { userId: judgeUser1.id, status: 'ACCEPTED' },
          { userId: judgeUser2.id, status: 'ACCEPTED' },
        ]
      }
    },
    include: { criteria: true, tracks: true, questions: true, judges: true },
  });

  const aiTrack = activeEvent.tracks.find(t => t.name === 'Artificial Intelligence');
  const cloudTrack = activeEvent.tracks.find(t => t.name === 'Cloud Infrastructure');

  console.log('[Seed] Creating teams for active event...');
  const team1 = await prisma.team.create({
    data: {
      eventId: activeEvent.id,
      name: 'NeuralPulse',
      inviteCode: 'TEAM-NP01',
      leaderId: participant1.id,
      members: {
        create: [
          { userId: participant1.id },
          { userId: participant2.id },
        ],
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
        create: [
          { userId: participant3.id },
          { userId: participant4.id },
        ],
      },
    },
  });

  console.log('[Seed] Creating sample submissions...');
  const sub1 = await prisma.submission.create({
    data: {
      eventId: activeEvent.id,
      teamId: team1.id,
      status: 'SUBMITTED',
      title: 'NeuralPulse: Realtime Autonomous Medical Diagnostics',
      tagline: 'AI copilot for emergency room triage',
      description: 'NeuralPulse processes multimodal clinical telemetry...',
      thumbnailUrl: 'https://via.placeholder.com/800x450.png?text=NeuralPulse+Thumbnail',
      imageGallery: JSON.stringify([
        'https://via.placeholder.com/800x450.png?text=Gallery+1',
        'https://via.placeholder.com/800x450.png?text=Gallery+2'
      ]),
      repoUrl: 'https://github.com/neuralpulse/hackathon-2026',
      demoUrl: 'https://neuralpulse.demo.app',
      videoUrl: 'https://youtube.com/watch?v=sample1',
      techStack: 'React, Vite, Node.js, PyTorch',
      trackId: aiTrack.id,
      answers: {
        create: [
          { questionId: activeEvent.questions[0].id, answer: 'We saw a need in hospitals.' },
          { questionId: activeEvent.questions[1].id, answer: 'Getting PyTorch to run fast on Edge.' }
        ]
      }
    },
  });

  const sub2 = await prisma.submission.create({
    data: {
      eventId: activeEvent.id,
      teamId: team2.id,
      status: 'DRAFT',
      title: 'QuantumLeap: Zero-Knowledge Supply Chain Traceability',
      tagline: 'Cryptographically verifiable carbon accounting',
      description: 'QuantumLeap allows global enterprise manufacturers to prove net-zero compliance...',
      thumbnailUrl: 'https://via.placeholder.com/800x450.png?text=QuantumLeap+Thumbnail',
      imageGallery: JSON.stringify([]),
      repoUrl: 'https://github.com/quantumleap/hackathon-2026',
      techStack: 'Next.js, Express, Circom',
      trackId: cloudTrack.id,
    },
  });

  console.log('[Seed] Adding scores from Judge 1 for SUBMITTED project...');
  const judge1Record = activeEvent.judges.find(j => j.userId === judgeUser1.id);
  
  for (const crit of activeEvent.criteria) {
    await prisma.score.create({
      data: {
        submissionId: sub1.id,
        judgeId: judge1Record.id,
        criterionId: crit.id,
        score: Math.min(10, Math.floor(Math.random() * 3) + 8),
        feedback: 'Brilliant technical execution.',
      },
    });
  }

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
