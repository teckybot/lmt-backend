// src/config/db.js
import { PrismaClient } from "@prisma/client";

let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  // Prevent multiple instances in dev (hot reload issue)
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

// Optional: single-time connection test
prisma.$connect()
  .then(() => console.log("Prisma connected to PostgreSQL"))
  .catch((err) => console.error("Prisma connection error:", err));

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
