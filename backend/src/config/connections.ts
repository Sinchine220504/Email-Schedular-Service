import Redis from 'ioredis';
import nodemailer from 'nodemailer';

let redisClient: Redis | null = null;
let emailTransporter: nodemailer.Transporter | null = null;

export async function initializeRedis(): Promise<Redis> {
  if (redisClient) return redisClient;

  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    // Required by BullMQ: ensure maxRetriesPerRequest is null
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redisClient.on('error', (err) => {
    console.error('❌ Redis error:', err);
  });

  return redisClient;
}

export async function initializeEmailTransporter(): Promise<nodemailer.Transporter> {
  if (emailTransporter) return emailTransporter;

  try {
    // For Ethereal Email (fake SMTP for testing)
    const testAccount = await nodemailer.createTestAccount();

    emailTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER || testAccount.user,
        pass: process.env.ETHEREAL_PASS || testAccount.pass,
      },
    });

    // Verify connection
    await emailTransporter.verify();
    console.log('✅ Email transporter configured');

    return emailTransporter;
  } catch (error) {
    console.error('❌ Failed to initialize email transporter:', error);
    throw error;
  }
}

export function getRedis(): Redis {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

export function getEmailTransporter(): nodemailer.Transporter {
  if (!emailTransporter) {
    throw new Error('Email transporter not initialized. Call initializeEmailTransporter() first.');
  }
  return emailTransporter;
}

export async function closeConnections(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
