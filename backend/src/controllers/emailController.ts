import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { EmailScheduleData, ScheduleListResponse, EmailListItem } from '../types';
import { scheduleEmailJob, getQueueStats } from '../services/queueService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Schedule emails for sending
 * 
 * Body:
 * {
 *   subject: string
 *   body: string
 *   recipients: string[] (array of email addresses)
 *   startTime: ISO string
 *   delayMs: number (optional, default 2000)
 *   hourlyLimit: number (optional, default 200)
 * }
 */
export async function scheduleEmails(req: Request, res: Response): Promise<void> {
  try {
    const { subject, body, recipients, startTime, delayMs = 2000, hourlyLimit = 200, attachments = [] } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: 'User ID required' });
      return;
    }

    if (!subject || !body || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!startTime) {
      res.status(400).json({ error: 'startTime is required' });
      return;
    }

    const scheduleStartTime = new Date(startTime);

    if (isNaN(scheduleStartTime.getTime())) {
      res.status(400).json({ error: 'Invalid startTime format' });
      return;
    }

    // Validate recipients are valid emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter((email) => !emailRegex.test(email.trim()));

    if (invalidEmails.length > 0) {
      res.status(400).json({
        error: `Invalid email addresses: ${invalidEmails.join(', ')}`,
      });
      return;
    }

    const validRecipients = recipients.map((e) => e.trim()).filter((e) => e);

    // Ensure user exists in database (create if doesn't exist)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: userId,
        name: userId.split('@')[0],
      },
    });

    // Create email schedule in database
    const schedule = await prisma.emailSchedule.create({
      data: {
        id: uuidv4(),
        userId,
        subject,
        body,
        recipients: JSON.stringify(validRecipients),
        startTime: scheduleStartTime,
        delayMs,
        hourlyLimit,
        totalCount: validRecipients.length,
        status: 'scheduled',
      },
    });

    // Create email jobs for each recipient and schedule them
    const createdJobs: any[] = [];

    for (let i = 0; i < validRecipients.length; i++) {
      const recipient = validRecipients[i];
      const scheduledTime = new Date(scheduleStartTime.getTime() + i * delayMs);

      const emailJob = await prisma.emailJob.create({
        data: {
          id: uuidv4(),
          scheduleId: schedule.id,
          userId,
          recipient,
          subject,
          body,
          scheduledTime,
          status: 'pending',
        },
      });

      // Schedule job in BullMQ
        try {
        const jobId = await scheduleEmailJob({
          scheduleId: schedule.id,
          userId,
          recipient,
          subject,
          body,
          scheduledTime,
          attachments,
        });

        createdJobs.push({
          jobId,
          recipient,
          scheduledTime,
        });

        // Update job ID in database
        await prisma.emailJob.update({
          where: { id: emailJob.id },
          data: { jobId },
        });
      } catch (error) {
        console.error(`Failed to schedule job for ${recipient}:`, error);
      }
    }

    res.status(201).json({
      scheduleId: schedule.id,
      totalEmails: validRecipients.length,
      status: 'scheduled',
      message: `Successfully scheduled ${validRecipients.length} email(s)`,
      createdJobs: createdJobs.length,
    });
  } catch (error) {
    console.error('Error scheduling emails:', error);
    res.status(500).json({
      error: 'Failed to schedule emails',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get scheduled emails for the user
 */
export async function getScheduledEmails(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: 'User ID required' });
      return;
    }

    const schedules = await prisma.emailSchedule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const formattedSchedules: ScheduleListResponse[] = schedules.map((schedule) => ({
      id: schedule.id,
      subject: schedule.subject,
      totalCount: schedule.totalCount,
      sentCount: schedule.sentCount,
      failedCount: schedule.failedCount,
      status: schedule.status,
      createdAt: schedule.createdAt.toISOString(),
      startTime: schedule.startTime.toISOString(),
    }));

    res.status(200).json(formattedSchedules);
  } catch (error) {
    console.error('Error fetching scheduled emails:', error);
    res.status(500).json({
      error: 'Failed to fetch scheduled emails',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get sent emails for the user
 */
export async function getSentEmails(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: 'User ID required' });
      return;
    }

    const emailJobs = await prisma.emailJob.findMany({
      where: {
        userId,
        status: { in: ['sent', 'failed'] },
      },
      orderBy: { sentTime: 'desc' },
      select: {
        id: true,
        recipient: true,
        subject: true,
        sentTime: true,
        status: true,
        errorMessage: true,
      },
    });

    const formattedEmails: EmailListItem[] = emailJobs.map((job) => ({
      id: job.id,
      recipient: job.recipient,
      subject: job.subject,
      sentTime: job.sentTime?.toISOString(),
      status: job.status,
    }));

    res.status(200).json(formattedEmails);
  } catch (error) {
    console.error('Error fetching sent emails:', error);
    res.status(500).json({
      error: 'Failed to fetch sent emails',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get schedule details with email jobs
 */
export async function getScheduleDetails(req: Request, res: Response): Promise<void> {
  try {
    const { scheduleId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: 'User ID required' });
      return;
    }

    const schedule = await prisma.emailSchedule.findFirst({
      where: { id: scheduleId, userId },
      include: {
        emailJobs: {
          orderBy: { scheduledTime: 'asc' },
        },
      },
    });

    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    const formattedJobs = schedule.emailJobs.map((job) => ({
      id: job.id,
      recipient: job.recipient,
      subject: job.subject,
      status: job.status,
      scheduledTime: job.scheduledTime.toISOString(),
      sentTime: job.sentTime?.toISOString(),
      errorMessage: job.errorMessage,
    }));

    res.status(200).json({
      id: schedule.id,
      subject: schedule.subject,
      body: schedule.body,
      startTime: schedule.startTime.toISOString(),
      delayMs: schedule.delayMs,
      hourlyLimit: schedule.hourlyLimit,
      status: schedule.status,
      totalCount: schedule.totalCount,
      sentCount: schedule.sentCount,
      failedCount: schedule.failedCount,
      createdAt: schedule.createdAt.toISOString(),
      emails: formattedJobs,
    });
  } catch (error) {
    console.error('Error fetching schedule details:', error);
    res.status(500).json({
      error: 'Failed to fetch schedule details',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStatus(req: Request, res: Response): Promise<void> {
  try {
    const stats = await getQueueStats();

    res.status(200).json({
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    res.status(500).json({
      error: 'Failed to fetch queue statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
