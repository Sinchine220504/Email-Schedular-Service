export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface ScheduledEmailSchedule {
  id: string;
  subject: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  createdAt: string;
  startTime: string;
}

export interface SentEmail {
  id: string;
  recipient: string;
  subject: string;
  sentTime?: string;
  status: string;
}

export interface ScheduleDetails {
  id: string;
  subject: string;
  body: string;
  startTime: string;
  delayMs: number;
  hourlyLimit: number;
  status: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  emails: Array<{
    id: string;
    recipient: string;
    subject: string;
    status: string;
    scheduledTime: string;
    sentTime?: string;
    errorMessage?: string;
  }>;
}

export interface AuthSession {
  user?: User;
  expires?: string;
}
