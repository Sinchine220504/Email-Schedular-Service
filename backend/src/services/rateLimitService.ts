import { getRedis } from '../config/connections';
import prisma from '../config/prisma';

/**
 * Rate Limiting Service
 * 
 * This service enforces email sending limits on a per-hour basis.
 * It uses Redis for fast lookups and PostgreSQL for persistence.
 * 
 * Strategy:
 * - Uses Redis for real-time rate limit tracking (fast, distributed)
 * - Falls back to DB if Redis key expires
 * - Keys are formatted as: rate-limit:{YYYY-MM-DD-HH}:{sender}
 * - Each hour window resets automatically (Redis TTL)
 */

const HOUR_IN_SECONDS = 3600;

/**
 * Get the current hour window as a string (YYYY-MM-DD-HH)
 */
export function getHourWindow(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}`;
}

/**
 * Get the next hour window
 */
export function getNextHourWindow(hourWindow: string): Date {
  const [year, month, day, hour] = hourWindow.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
  date.setUTCHours(date.getUTCHours() + 1);
  return date;
}

/**
 * Check if a sender has reached the hourly rate limit
 * Returns: { canSend: boolean, currentCount: number, limit: number }
 */
export async function checkRateLimit(sender: string, limit: number): Promise<{
  canSend: boolean;
  currentCount: number;
  limit: number;
  nextWindowTime: Date;
}> {
  const redis = getRedis();
  const hourWindow = getHourWindow();
  const redisKey = `rate-limit:${hourWindow}:${sender}`;

  try {
    // Try Redis first for performance
    let count = await redis.get(redisKey);

    if (count === null) {
      // Key expired or doesn't exist, check database
      const dbRecord = await prisma.rateLimitCounter.findUnique({
        where: {
          hour_sender: {
            hour: hourWindow,
            sender,
          },
        },
      });

      count = dbRecord?.count.toString() || '0';
    }

    const currentCount = parseInt(count, 10);
    const canSend = currentCount < limit;
    const nextWindow = getNextHourWindow(hourWindow);

    return {
      canSend,
      currentCount,
      limit,
      nextWindowTime: nextWindow,
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // On error, be conservative and deny if we can't verify
    throw error;
  }
}

/**
 * Increment the rate limit counter for a sender
 * Safe for concurrent access across multiple workers
 */
export async function incrementRateLimit(sender: string): Promise<number> {
  const redis = getRedis();
  const hourWindow = getHourWindow();
  const redisKey = `rate-limit:${hourWindow}:${sender}`;

  try {
    // Increment in Redis
    const newCount = await redis.incr(redisKey);

    // Set expiration to ensure key expires after the hour
    if (newCount === 1) {
      // First increment in this window, set TTL
      await redis.expire(redisKey, HOUR_IN_SECONDS + 60); // +60s buffer
    }

    // Also update DB for persistence (async, doesn't block)
    prisma.rateLimitCounter.upsert({
      where: {
        hour_sender: {
          hour: hourWindow,
          sender,
        },
      },
      update: {
        count: newCount,
        updatedAt: new Date(),
      },
      create: {
        hour: hourWindow,
        sender,
        count: newCount,
      },
    }).catch((error) => {
      console.error('Error updating rate limit in DB:', error);
    });

    return newCount;
  } catch (error) {
    console.error('Error incrementing rate limit:', error);
    throw error;
  }
}

/**
 * Reset rate limit counter for testing/admin purposes
 */
export async function resetRateLimit(sender?: string): Promise<void> {
  const redis = getRedis();
  const hourWindow = getHourWindow();

  if (sender) {
    const redisKey = `rate-limit:${hourWindow}:${sender}`;
    await redis.del(redisKey);
    await prisma.rateLimitCounter.deleteMany({
      where: {
        hour: hourWindow,
        sender,
      },
    });
  } else {
    // Reset all for current hour
    const keys = await redis.keys(`rate-limit:${hourWindow}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
