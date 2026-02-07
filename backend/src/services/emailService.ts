import { getEmailTransporter } from '../config/connections';
import prisma from '../config/prisma';
import { EmailJobData } from '../types';

/**
 * Email Service
 * 
 * Handles sending emails via Ethereal Email (fake SMTP)
 * All emails are sent from the Ethereal account configured in env
 */

export async function sendEmail(
  recipient: string,
  subject: string,
  body: string,
  sender: string = 'noreply@reachinbox.app',
  attachments?: Array<{ filename: string; contentBase64: string; contentType: string }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = getEmailTransporter();

    const mailOptions: any = {
      from: sender,
      to: recipient,
      subject,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            ${body}
            <hr style="margin-top: 2rem; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This is a test email sent via Ethereal Email.<br/>
              Message ID: ${new Date().getTime()}
            </p>
          </body>
        </html>
      `,
      text: body,
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.contentBase64, 'base64'),
        contentType: a.contentType,
      }));
    }

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent to ${recipient}:`, info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to send email to ${recipient}:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Update email job status in database
 */
export async function updateEmailJobStatus(
  jobId: string,
  status: 'sent' | 'failed' | 'pending',
  options?: {
    sentTime?: Date;
    errorMessage?: string;
  }
): Promise<void> {
  try {
    await prisma.emailJob.update({
      where: { id: jobId },
      data: {
        status,
        sentTime: options?.sentTime,
        errorMessage: options?.errorMessage,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error updating email job status:', error);
    throw error;
  }
}

/**
 * Get email job count by status
 */
export async function getEmailJobCountByStatus(
  scheduleId: string,
  status: string
): Promise<number> {
  try {
    const count = await prisma.emailJob.count({
      where: {
        scheduleId,
        status,
      },
    });

    return count;
  } catch (error) {
    console.error('Error getting email job count:', error);
    throw error;
  }
}

/**
 * Update schedule counts
 */
export async function updateScheduleCounts(scheduleId: string): Promise<void> {
  try {
    const sentCount = await getEmailJobCountByStatus(scheduleId, 'sent');
    const failedCount = await getEmailJobCountByStatus(scheduleId, 'failed');

    const schedule = await prisma.emailSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (schedule) {
      const sentPlus = sentCount + failedCount;
      const isCompleted = sentPlus >= schedule.totalCount;

      await prisma.emailSchedule.update({
        where: { id: scheduleId },
        data: {
          sentCount,
          failedCount,
          status: isCompleted ? 'completed' : 'in-progress',
          updatedAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error('Error updating schedule counts:', error);
    throw error;
  }
}
