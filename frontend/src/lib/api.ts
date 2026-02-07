import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

let instance: AxiosInstance;

export function getApiClient(userId?: string): AxiosInstance {
  if (!instance) {
    instance = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  if (userId) {
    instance.defaults.headers['x-user-id'] = userId;
  }

  return instance;
}

export const API = {
  scheduleEmails: async (
    userId: string,
    data: {
      subject: string;
      body: string;
      recipients: string[];
      startTime: string;
      delayMs: number;
      hourlyLimit: number;
      attachments?: Array<{ filename: string; contentBase64: string; contentType: string }>;
    }
  ) => {
    const client = getApiClient(userId);
    return client.post('/emails/schedule', data);
  },

  getScheduledEmails: async (userId: string) => {
    const client = getApiClient(userId);
    return client.get('/emails/scheduled');
  },

  getSentEmails: async (userId: string) => {
    const client = getApiClient(userId);
    return client.get('/emails/sent');
  },

  getScheduleDetails: async (userId: string, scheduleId: string) => {
    const client = getApiClient(userId);
    return client.get(`/emails/schedule/${scheduleId}`);
  },

  getQueueStatus: async (userId: string) => {
    const client = getApiClient(userId);
    return client.get('/emails/queue/status');
  },
};
