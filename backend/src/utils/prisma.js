const path = require('path');
const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'file:./dev.db' || process.env.DATABASE_URL === 'file:./backend/prisma/dev.db') {
  const absoluteDbPath = path.resolve(__dirname, '../../prisma/dev.db');
  process.env.DATABASE_URL = `file:${absoluteDbPath}`;
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
