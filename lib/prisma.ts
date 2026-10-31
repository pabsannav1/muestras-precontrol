import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Filtro "contiene" sin distinguir mayúsculas (SQLite ya lo es en LIKE; PostgreSQL necesita mode). */
export function contiene(q: string) {
  return (process.env.DATABASE_URL?.startsWith("postgres") ? { contains: q, mode: "insensitive" } : { contains: q }) as {
    contains: string;
  };
}
