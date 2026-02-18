//import { PrismaClient } from "@/generated/prisma";

import { PrismaClient, Prisma } from "./generated/prisma";

export { Prisma };
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

// Ensure environment variables are loaded before PrismaClient initialization
config();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined}

// Prisma 7 requires adapter or accelerateUrl. During build time, use dummy URL for adapter.
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'development');

const connectionString = process.env.DATABASE_URL ?? (isBuildTime
  ? 'postgresql://dummy:dummy@dummy:5432/dummy?schema=public'
  : 'postgresql://dummy:dummy@dummy:5432/dummy');

if (!process.env.DATABASE_URL && !isBuildTime) {
  console.warn('DATABASE_URL is not set. Using dummy URL for build-time validation only.');
}

const adapter = new PrismaPg({ connectionString });

const logConfig = (process.env.NODE_ENV === "development"
  ? [
      { emit: 'event' as const, level: 'error' as const },
      { emit: 'event' as const, level: 'warn' as const }
    ] as const
  : [
      { emit: 'event' as const, level: 'error' as const }
    ] as const) as Array<{ emit: 'event'; level: 'error' | 'warn' }>

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: isBuildTime ? [] : logConfig,
});

// Handle connection errors and reconnect
(prisma.$on as (event: 'error' | 'warn', callback: (e: unknown) => void) => void)('error', (e: unknown) => {
  console.error('Prisma Client Error:', e);
});

// Handle warnings in development
if (process.env.NODE_ENV === "development") {
  (prisma.$on as (event: 'error' | 'warn', callback: (e: unknown) => void) => void)('warn', (e: unknown) => {
    console.warn('Prisma Client Warning:', e);
  });
}

// Ensure connection is active before queries
async function ensureConnection() {
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    // Try to reconnect after a delay
    setTimeout(async () => {
      try {
        await prisma.$disconnect();
        await prisma.$connect();
        console.log('Database reconnected successfully');
      } catch (reconnectError) {
        console.error('Failed to reconnect:', reconnectError);
      }
    }, 2000);
  }
}

// Initialize connection only if DATABASE_URL is set and not during build
if (process.env.NODE_ENV !== "production" && process.env.DATABASE_URL && !process.env.NEXT_PHASE) {
  ensureConnection();
}

// Add connection retry logic
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

// Helper function to execute queries with retry logic
export async function executeWithRetry<T>(
  query: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await query();
    } catch (error: unknown) {
      lastError = error;
      
      // Check if it's a connection error
      const isConnectionError = 
        (error instanceof Error && (
          error.message.includes('connection') ||
          error.message.includes('ConnectionReset') ||
          error.message.includes('closed by the remote host')
        )) ||
        (typeof error === 'object' && error !== null && 'code' in error && 
         (error.code === 'P1001' || error.code === 'P1017' || error.code === 'P1008'));
      
      if (isConnectionError && attempt < maxRetries) {
        console.warn(`Database connection error (attempt ${attempt}/${maxRetries}), retrying...`);
        // Try to reconnect
        try {
          await prisma.$disconnect();
          await prisma.$connect();
        } catch (reconnectError) {
          console.error('Failed to reconnect:', reconnectError);
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

