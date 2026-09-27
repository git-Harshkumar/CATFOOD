const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Clearing existing data...');
  await prisma.score.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.judgeAssignment.deleteMany();
  await prisma.criterion.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  console.log('[Seed] Creating demo users...');
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@hack.com',
      name: 'Sarah Connor (Organizer)',
      role: 'ORGANIZER',
      passwordHash: defaultPasswordHash,
    },
  });

  const judge1 = await prisma.user.create({
    data: {
      email: 'judge1@hack.com',
      name: 'Dr. Alan Turing (Judge)',
      role: 'JUDGE',
      passwordHash: defaultPasswordHash,
    },
  });

  const judge2 = await prisma.user.create({
    data: {
      email: 'judge2@hack.com',
      name: 'Ada Lovelace (Judge)',
      role: 'JUDGE',
      passwordHash: defaultPasswordHash,
    },
  });

  const participant1 = await prisma.user.create({
    data: {
      email: 'alice@hack.com',
      name: 'Alice Johnson',
      role: 'PARTICIPANT',
      passwordHash: defaultPasswordHash,
    },
  });

  const participant2 = await prisma.user.create({
    data: {
      email: 'bob@hack.com',
      name: 'Bob Smith',
      role: 'PARTICIPANT',
      passwordHash: defaultPasswordHash,
    },
  });

  const participant3 = await prisma.user.create({
    data: {
      email: 'charlie@hack.com',
      name: 'Charlie Brown',
      role: 'PARTICIPANT',
      passwordHash: defaultPasswordHash,
    },
  });

  const participant4 = await prisma.user.create({
    data: {
      email: 'dana@hack.com',
      name: 'Dana Scully',
      role: 'PARTICIPANT',
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
      description: 'Join 500+ developers worldwide in building state-of-the-art AI, developer tools, and cloud platforms. Showcase your creativity, technical rigor, and product design.',
      rules: '1. All code must be written during the hackathon.\n2. Teams can consist of 1 to 4 members.\n3. Projects must include a public repository and a working demo or video.',
      minTeamSize: 1,
      maxTeamSize: 4,
      startDate: pastStartDate,
      deadline: futureDeadline,
      status: 'ACTIVE',
      isLeaderboardPublished: false,
      organizerId: organizer.id,
      criteria: {
        create: [
          { name: 'Innovation & Novelty', description: 'Originality of concept and creative problem solving', maxScore: 10, weight: 1.2 },
          { name: 'Technical Depth & Architecture', description: 'Code architecture, robustness, and execution excellence', maxScore: 10, weight: 1.0 },
          { name: 'UI / UX Design', description: 'Visual polish, intuition, accessibility and responsiveness', maxScore: 10, weight: 0.8 },
          { name: 'Impact & Commercial Viability', description: 'Practical business or social value delivered', maxScore: 10, weight: 1.0 },
        ],
      },
      judges: {
        create: [
          { judgeId: judge1.id },
          { judgeId: judge2.id },
        ],
      },
    },
    include: { criteria: true },
  });

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
      title: 'NeuralPulse: Realtime Autonomous Medical Diagnostics',
      tagline: 'AI copilot for emergency room triage and radiology anomaly detection',
      description: 'NeuralPulse processes multimodal clinical telemetry, vital signs, and X-ray imaging in real time with sub-100ms inference to alert triage physicians of critical cardiac and pulmonary anomalies before decompensation occurs.',
      repoUrl: 'https://github.com/neuralpulse/hackathon-2026',
      demoUrl: 'https://neuralpulse.demo.app',
      videoUrl: 'https://youtube.com/watch?v=sample1',
      techStack: 'React, Vite, Node.js, PyTorch, FastAPI, WebSockets, TailwindCSS',
    },
  });

  const sub2 = await prisma.submission.create({
    data: {
      eventId: activeEvent.id,
      teamId: team2.id,
      title: 'QuantumLeap: Zero-Knowledge Supply Chain Traceability',
      tagline: 'Cryptographically verifiable carbon accounting and logistics ledger',
      description: 'QuantumLeap allows global enterprise manufacturers to prove net-zero compliance across multi-tier supplier networks without exposing proprietary trade secrets or sensitive pricing data using zk-SNARK proofs.',
      repoUrl: 'https://github.com/quantumleap/hackathon-2026',
      demoUrl: 'https://quantumleap.demo.app',
      videoUrl: 'https://youtube.com/watch?v=sample2',
      techStack: 'Next.js, Express, Prisma, Circom, SnarkJS, SQLite',
    },
  });

  console.log('[Seed] Adding scores from Judge 1...');
  for (const crit of activeEvent.criteria) {
    await prisma.score.create({
      data: {
        submissionId: sub1.id,
        judgeId: judge1.id,
        criterionId: crit.id,
        score: Math.min(10, Math.floor(Math.random() * 3) + 8), // 8-10
        feedback: 'Brilliant technical execution and well thought out clinical architecture.',
      },
    });

    await prisma.score.create({
      data: {
        submissionId: sub2.id,
        judgeId: judge1.id,
        criterionId: crit.id,
        score: Math.min(10, Math.floor(Math.random() * 3) + 7), // 7-9
        feedback: 'Very solid cryptographic formulation with clean UI implementation.',
      },
    });
  }

  console.log('[Seed] Creating concluded event with published leaderboard...');
  const pastConcludedDeadline = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const concludedEvent = await prisma.event.create({
    data: {
      title: 'Winter Web3 & FinTech Sprint 2025',
      tagline: 'Reinventing decentralized finance and consumer payments',
      description: 'A 48-hour global sprint to design consumer-friendly crypto experiences.',
      rules: 'Standard hackathon rules apply.',
      minTeamSize: 1,
      maxTeamSize: 3,
      startDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      deadline: pastConcludedDeadline,
      status: 'COMPLETED',
      isLeaderboardPublished: true,
      organizerId: organizer.id,
      criteria: {
        create: [
          { name: 'Innovation', maxScore: 10, weight: 1.0 },
          { name: 'Execution', maxScore: 10, weight: 1.0 },
        ],
      },
    },
  });

  console.log('[Seed] Database seeding completed successfully!');
  console.log('Demo Credentials:');
  console.log('  Organizer: organizer@hack.com / password123');
  console.log('  Judge:     judge1@hack.com    / password123');
  console.log('  Judge 2:   judge2@hack.com    / password123');
  console.log('  Alice:     alice@hack.com     / password123 (Leader: NeuralPulse)');
  console.log('  Bob:       bob@hack.com       / password123 (Member: NeuralPulse)');
  console.log('  Charlie:   charlie@hack.com   / password123 (Leader: QuantumLeap)');
  console.log('  Dana:      dana@hack.com      / password123 (Member: QuantumLeap)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
