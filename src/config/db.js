// src/config/db.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Optional: log connection
(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Prisma connected to PostgreSQL');
  } catch (e) {
    console.error('Prisma connection error:', e);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
