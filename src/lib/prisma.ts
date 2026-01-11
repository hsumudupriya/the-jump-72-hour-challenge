import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { logDbQuery } from './db-logger';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL;
    const isDev = process.env.NODE_ENV !== 'production';

    // Render PostgreSQL requires SSL
    const pool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false, // Required for Render's self-signed certificates
        },
    });

    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({
        adapter,
        // Enable query logging in development
        log: isDev ? [{ emit: 'event', level: 'query' }] : [],
    });

    // Attach query event handler for logging in development
    if (isDev) {
        client.$on('query', (e) => {
            logDbQuery(e.query, e.params, e.duration);
        });
    }

    return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
