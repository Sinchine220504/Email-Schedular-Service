import { Router } from 'express';
import {
  scheduleEmails,
  getScheduledEmails,
  getSentEmails,
  getScheduleDetails,
  getQueueStatus,
} from '../controllers/emailController';

const router = Router();

// POST /api/emails/schedule - Schedule emails
router.post('/schedule', scheduleEmails);

// GET /api/emails/scheduled - Get user's scheduled emails
router.get('/scheduled', getScheduledEmails);

// GET /api/emails/sent - Get user's sent emails
router.get('/sent', getSentEmails);

// GET /api/emails/schedule/:scheduleId - Get schedule details
router.get('/schedule/:scheduleId', getScheduleDetails);

// GET /api/emails/queue/status - Get queue statistics
router.get('/queue/status', getQueueStatus);

export default router;
