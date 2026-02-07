export interface EmailScheduleData {
  subject: string;
  body: string;
  recipients: string[];
  startTime: Date;
  delayMs: number;
  hourlyLimit: number;
  userId: string;
}

export interface EmailJobData {
  scheduleId: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledTime: Date;
  attachments?: Array<{
    filename: string;
    contentBase64: string;
    contentType: string;
  }>;
}

export interface ScheduleEmailResponse {
  scheduleId: string;
  totalEmails: number;
  status: string;
  message: string;
}

export interface EmailListItem {
  id: string;
  recipient: string;
  subject: string;
  scheduledTime?: string;
  sentTime?: string;
  status: string;
}

export interface ScheduleListResponse {
  id: string;
  subject: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  createdAt: string;
  startTime: string;
}
