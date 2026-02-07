# ReachInbox - Email Scheduler

A production-grade email scheduling system with persistent job queuing, rate limiting, and real-time dashboard.

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 16
- Redis 7

### 1. Setup Environment Variables

**Backend** (`backend/.env`):
```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reachinbox"
REDIS_URL="redis://localhost:6379"
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

# Ethereal Email (optional - for real email sending)
ETHEREAL_USER=your_ethereal_email@ethereal.email
ETHEREAL_PASS=your_ethereal_password

# Rate Limiting & Performance
MAX_EMAILS_PER_HOUR=200
DELAY_BETWEEN_EMAILS_MS=2000
WORKER_CONCURRENCY=5
```

**Frontend** (`frontend/.env.local`):
```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 2. Run Backend
```bash
cd backend
npm install
npm run dev
# Server starts on http://localhost:3000
```

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend starts on http://localhost:3001 (auto-selected if 3000 in use)
```

### 4. Access Application
Open browser: **http://localhost:3001**

---

## Setting Up Ethereal Email

Ethereal is a fake SMTP service perfect for testing. Currently, the app sends to Ethereal by default.

1. **Create free account**: https://ethereal.email
2. **Get credentials**:
   - Copy the email address (e.g., `firstname.lastname@ethereal.email`)
   - Copy the password
3. **Add to `backend/.env`**:
   ```dotenv
   ETHEREAL_USER=firstname.lastname@ethereal.email
   ETHEREAL_PASS=your_password_here
   ```
4. **Restart backend** - emails will now route through Ethereal
5. **View sent emails**: Log into Ethereal dashboard to see message logs

---

## Architecture Overview

### Email Scheduling Flow

```
User composes email → Frontend validation → Schedule request
    ↓
Backend receives request → Create EmailSchedule record
    ↓
For each recipient → Create EmailJob in database + BullMQ queue
    ↓
BullMQ Worker processes job at scheduled time
    ↓
Check rate limits → Send via Nodemailer → Update status to 'sent'
    ↓
Update schedule counts → Mark as completed when all sent
    ↓
Frontend polls /api/emails/sent → Display in Sent Emails tab
```

### Persistence on Restart

**The Challenge**: Job queues lose data on restart. Users lose scheduled emails.

**The Solution**: Hybrid Redis + PostgreSQL approach

1. **BullMQ in Redis**: Fast, in-memory job queue with auto-retry
2. **PostgreSQL as Source of Truth**:
   - `EmailSchedule` table stores campaign metadata (subject, recipients, start time)
   - `EmailJob` table stores individual email job status
   - On startup, BullMQ worker checks database for pending jobs and reschedules them

**Key Implementation**:
- Jobs stored in PostgreSQL are recovered on backend restart
- BullMQ queue holds active jobs with automatic retries (3 attempts)
- Status updates (pending → sent/failed) persist in database
- No emails are lost or duplicated during restarts

### Rate Limiting & Concurrency

**Rate Limiting** (atomic Redis counters):
- Limit: 200 emails/hour (configurable via `MAX_EMAILS_PER_HOUR`)
- Window: Rolling hourly window using Redis `INCR` with expiry
- Implementation: Check current hour count before sending; if exceeded, reschedule job to next hour

**Concurrency Control** (BullMQ Worker):
- Max concurrent jobs: 5 (configurable via `WORKER_CONCURRENCY`)
- Prevents overwhelming SMTP server
- Each job waits 2000ms (configurable) after sending before next email

**How It Works**:
1. Before sending each email, check Redis counter for `noreply@reachinbox.app`
2. If counter < 200, increment and send
3. If counter >= 200, reschedule job to next hour window
4. Each worker processes max 5 emails simultaneously
5. 2000ms delay between sends ensures SMTP server stability

---

## Features Implemented

### Backend Features

| Feature | Implementation | Details |
|---------|-----------------|---------|
| **Email Scheduling** | BullMQ delayed job queue | Configurable start time, automatic job creation for each recipient |
| **Persistence** | PostgreSQL + Prisma ORM | Automatic job recovery on restart, no data loss |
| **Rate Limiting** | Redis atomic counters | Per-hour limits with automatic rescheduling to next window |
| **Concurrency Control** | BullMQ worker pool | Max concurrent jobs, delay between sends |
| **Attachments** | Base64 encoding | Images, PDFs, documents converted to Buffer on send |
| **Error Handling** | Auto-retry (3 attempts) | Exponential backoff, detailed error logging |
| **User Management** | Auto-create demo users | Users created on first email schedule request |
| **Status Tracking** | Real-time updates | pending → sent/failed with timestamps |
| **CORS** | Secure origin config | Configured for frontend on localhost:3001 |
| **Database ORM** | Prisma migrations | Type-safe queries, automatic schema management |

### Frontend Features

| Feature | Implementation | Details |
|---------|-----------------|---------|
| **Authentication** | Demo auth context | localStorage-backed, easy to swap for real auth |
| **Responsive Design** | Mobile-first Tailwind | Works on all screen sizes |
| **Sidebar Navigation** | User profile, counts | Quick access buttons, email statistics |
| **Email Composer** | Multi-recipient modal | Subject, body, recipients, attachments |
| **Recipient Management** | Chips with remove | Add/remove individual recipients, bulk CSV upload |
| **File Attachments** | Drag-drop upload | Images, PDFs, documents as base64 |
| **Campaign Scheduling** | Date/time picker | Set start time, delay between emails, hourly limit |
| **Scheduled Tab** | Campaign list | Pending emails with recipient counts |
| **Sent Tab** | Email list | Delivered/failed with timestamps, real-time updates |
| **Message Details** | Full preview | Subject, body, metadata, attachment gallery |
| **Auto-Refresh** | 5-second polling | Real-time email status updates |
| **User Feedback** | Toast notifications | Success/error messages on actions |

---

## Project Structure

```
ReachInbox/
├── backend/
│   ├── src/
│   │   ├── index.ts                    # Express server, middleware setup
│   │   ├── controllers/
│   │   │   └── emailController.ts      # Schedule, list, status endpoints
│   │   ├── services/
│   │   │   ├── queueService.ts         # BullMQ worker, job processing
│   │   │   ├── emailService.ts         # Nodemailer, email sending
│   │   │   └── rateLimitService.ts     # Redis rate limit checks
│   │   ├── config/
│   │   │   ├── prisma.ts               # Prisma client instance
│   │   │   └── connections.ts          # Redis, DB initialization
│   │   ├── middleware/
│   │   │   └── auth.ts                 # x-user-id header validation
│   │   ├── types/
│   │   │   └── index.ts                # EmailJobData, API types
│   │   └── routes/
│   │       └── emailRoutes.ts          # POST/GET endpoints
│   ├── prisma/
│   │   ├── schema.prisma               # User, EmailSchedule, EmailJob models
│   │   └── migrations/
│   ├── .env                            # Environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                # Main dashboard, tabs, sidebar
│   │   │   ├── login/page.tsx          # Login page
│   │   │   └── providers.tsx           # AuthProvider wrapper
│   │   ├── components/
│   │   │   ├── ComposeEmailModal.tsx   # Email composer form
│   │   │   ├── MessageList.tsx         # Email list view
│   │   │   ├── MessageView.tsx         # Email detail view
│   │   │   └── ui.tsx                  # Buttons, inputs, modals, etc.
│   │   ├── lib/
│   │   │   ├── auth-context.tsx        # Demo auth logic
│   │   │   ├── api.ts                  # Axios client, endpoints
│   │   │   └── utils.ts                # formatDate, parseEmails
│   │   └── types/
│   │       └── index.ts                # ScheduledEmailSchedule, SentEmail
│   ├── .env.local                      # NEXT_PUBLIC_API_URL
│   ├── next.config.js                  # API rewrites to backend
│   └── package.json
│
└── README.md
```

---

## API Endpoints

### Schedule Emails
**POST** `/api/emails/schedule`

**Request**:
```json
{
  "subject": "Welcome Email",
  "body": "<h1>Hello World</h1>",
  "recipients": ["user@example.com", "user2@example.com"],
  "startTime": "2026-02-07T15:30:00.000Z",
  "delayMs": 2000,
  "hourlyLimit": 200,
  "attachments": [
    {
      "filename": "image.png",
      "contentBase64": "iVBORw0KGgoAAAANS...",
      "contentType": "image/png"
    }
  ]
}
```

**Response**:
```json
{
  "scheduleId": "550e8400-e29b-41d4-a716-446655440000",
  "totalEmails": 2,
  "status": "scheduled",
  "message": "Successfully scheduled 2 email(s)",
  "createdJobs": 2
}
```

### Get Scheduled Emails
**GET** `/api/emails/scheduled`

**Response**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "subject": "Welcome Email",
    "totalCount": 2,
    "sentCount": 1,
    "failedCount": 0,
    "status": "in-progress",
    "startTime": "2026-02-07T15:30:00.000Z",
    "createdAt": "2026-02-07T15:20:00.000Z"
  }
]
```

### Get Sent Emails
**GET** `/api/emails/sent`

**Response**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "recipient": "user@example.com",
    "subject": "Welcome Email",
    "sentTime": "2026-02-07T15:30:05.123Z",
    "status": "sent"
  }
]
```

---

## Common Tasks

### View Sent Emails (Ethereal)
1. Go to https://ethereal.email
2. Log in with your test account
3. Check "Messages" tab

### Adjust Rate Limits
Edit `backend/.env`:
```dotenv
MAX_EMAILS_PER_HOUR=500          # Increase from 200
DELAY_BETWEEN_EMAILS_MS=1000     # Decrease from 2000
WORKER_CONCURRENCY=10            # Increase from 5
```
Restart backend for changes.

### Monitor Queue
Backend logs show:
- `📬 Email job scheduled` - Job added
- `⏳ Processing email job` - Sending
- `✅ Email sent` - Success
- `❌ Failed` - Error occurred

---

## Tech Stack

**Backend**: TypeScript, Express.js, BullMQ, Redis, PostgreSQL, Prisma, Nodemailer

**Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Axios

