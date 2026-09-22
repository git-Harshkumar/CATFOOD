const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const events = await prisma.event.findMany();
  const teams = await prisma.team.findMany();
  const teamMembers = await prisma.teamMember.findMany();
  const judgeAssignments = await prisma.judgeAssignment.findMany();
  const criteria = await prisma.criterion.findMany();
  const submissions = await prisma.submission.findMany();
  const scores = await prisma.score.findMany();

  const data = {
    users,
    events,
    teams,
    teamMembers,
    judgeAssignments,
    criteria,
    submissions,
    scores
  };

  fs.writeFileSync('./prisma/exported_data.json', JSON.stringify(data, null, 2));
  console.log('Data exported to exported_data.json');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
