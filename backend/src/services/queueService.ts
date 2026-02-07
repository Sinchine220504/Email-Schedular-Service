import { Queue, Worker, QueueEvents } from 'bullmq';
import { getRedis } from '../config/connections';
import { EmailJobData } from '../types';
import { sendEmail, updateEmailJobStatus, updateScheduleCounts } from '../services/emailService';
import { checkRateLimit, incrementRateLimit } from '../services/rateLimitService';
import prisma from '../config/prisma';

let emailQueue: Queue<EmailJobData> | null = null;
let emailWorker: Worker<EmailJobData> | null = null;
let queueEvents: QueueEvents | null = null;

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
const DELAY_BETWEEN_EMAILS_MS = parseInt(process.env.DELAY_BETWEEN_EMAILS_MS || '2000', 10);
const MAX_EMAILS_PER_HOUR = parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10);

/**
 * Initialize BullMQ queue
 */
export async function initializeQueue(): Promise<Queue<EmailJobData>> {
  if (emailQueue) return emailQueue;

  const redis = getRedis();

  emailQueue = new Queue<EmailJobData>('emails', {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours for debugging
      },
    },
  });

  console.log('✅ BullMQ Queue initialized');
  return emailQueue;
}

/**
 * Initialize BullMQ worker to process email jobs
 */
export async function initializeWorker(): Promise<Worker<EmailJobData>> {
  if (emailWorker) return emailWorker;

  const redis = getRedis();

  emailWorker = new Worker<EmailJobData>(
    'emails',
    async (job) => {
      try {
        const { scheduleId, userId, recipient, subject, body } = job.data;

        console.log(`⏳ Processing email job ${job.id} for ${recipient}`);

        // Check rate limit before sending
        const sender = 'noreply@reachinbox.app';
        const rateLimitCheck = await checkRateLimit(sender, MAX_EMAILS_PER_HOUR);

        if (!rateLimitCheck.canSend) {
          console.log(
            `⏸️  Rate limit reached (${rateLimitCheck.currentCount}/${rateLimitCheck.limit}). Rescheduling...`
          );

          // Reschedule job to next hour
          const nextWindow = rateLimitCheck.nextWindowTime;
          const delayMs = nextWindow.getTime() - Date.now();

          if (delayMs > 0) {
            await job.moveToDelayed(delayMs, job.token);
            return;
          }
        }

        // Send email
        const result = await sendEmail(recipient, subject, body, sender, job.data.attachments as any);

        if (result.success) {
          // Increment rate limit counter
          await incrementRateLimit(sender);

          // Update job status to sent
          const emailJob = await prisma.emailJob.findUnique({
            where: { id: job.data.scheduleId || '' },
          });

          if (emailJob) {
            await updateEmailJobStatus(job.data.scheduleId || '', 'sent', {
              sentTime: new Date(),
            });
          }

          // Add delay between emails to avoid overwhelming SMTP
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_EMAILS_MS));

          // Update schedule counts
          await updateScheduleCounts(scheduleId);

          console.log(`✅ Email sent successfully for job ${job.id}`);
          return { success: true, messageId: result.messageId };
        } else {
          // Email send failed
          const emailJob = await prisma.emailJob.findUnique({
            where: { id: job.data.scheduleId || '' },
          });

          if (emailJob) {
            await updateEmailJobStatus(job.data.scheduleId || '', 'failed', {
              errorMessage: result.error,
            });
          }

          await updateScheduleCounts(scheduleId);

          throw new Error(result.error || 'Failed to send email');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Job ${job.id} failed:`, errorMessage);

        // Update job status to failed
        const emailJob = await prisma.emailJob.findUnique({
          where: { id: job.data.scheduleId || '' },
        });

        if (emailJob) {
          await updateEmailJobStatus(job.data.scheduleId || '', 'failed', {
            errorMessage,
          });
        }

        throw error;
      }
    },
    {
      connection: redis,
      concurrency: WORKER_CONCURRENCY,
    }
  );

  // Event handlers
  emailWorker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  emailWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  emailWorker.on('error', (err) => {
    console.error('❌ Worker error:', err);
  });

  console.log(`✅ BullMQ Worker initialized with concurrency: ${WORKER_CONCURRENCY}`);
  return emailWorker;
}

/**
 * Get the queue instance
 */
export function getQueue(): Queue<EmailJobData> {
  if (!emailQueue) {
    throw new Error('Queue not initialized. Call initializeQueue() first.');
  }
  return emailQueue;
}

/**
 * Schedule an email job
 */
export async function scheduleEmailJob(data: EmailJobData): Promise<string | undefined> {
  const queue = getQueue();

  const delay = data.scheduledTime.getTime() - Date.now();

  const job = await queue.add(`email-${data.recipient}`, data, {
    delay: Math.max(0, delay),
    jobId: `${data.scheduleId}-${data.recipient}-${Date.now()}`,
  });

  console.log(`📬 Email job scheduled: ${job.id} (delay: ${delay}ms)`);

  return job.id;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getQueue();

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Close queue and worker
 */
export async function closeQueue(): Promise<void> {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
  }
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
  }
  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }
}
