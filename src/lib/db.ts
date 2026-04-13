import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as {
  pool?: Pool;
  prisma?: PrismaClient;
};

const connectionString =
  env.DATABASE_URL ??
  "postgresql://hiretea:hiretea@localhost:5432/hiretea?schema=public";

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 20 : 8,
  });

const adapter = new PrismaPg(pool);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
  globalForPrisma.prisma = db;
}
