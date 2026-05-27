import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    pgPool: pg.Pool | undefined;
};

if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new pg.Pool({
        connectionString: process.env.DIRECT_URL!,
        max: 3,
        idleTimeoutMillis: 30000,
    });
}

if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg({ pool: globalForPrisma.pgPool });
    globalForPrisma.prisma = new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma;
