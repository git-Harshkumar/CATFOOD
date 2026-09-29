const prisma = require('../utils/prisma');
const seed = require('./seed-fixtures');

async function main() {
  try {
    const userCount = await prisma.user.count();
    const eventCount = await prisma.event.count();

    if (process.env.FORCE_SEED === 'true' || (userCount === 0 && eventCount === 0)) {
      console.log(`[Init-DB] Database is empty (users: ${userCount}, events: ${eventCount}) or FORCE_SEED=true.`);
      console.log('[Init-DB] Seeding database with initial fixtures...');
      await seed();
      console.log('[Init-DB] Initial database seeding completed successfully.');
    } else {
      console.log(`[Init-DB] Database already initialized (${userCount} users, ${eventCount} events). Skipping seed.`);
    }
  } catch (error) {
    console.error('[Init-DB] Error checking/initializing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
