import express, { Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { authMiddleware, securityMiddleware, errorHandler } from './middleware';
import emailRoutes from './routes/emailRoutes';
import {
  initializeRedis,
  initializeEmailTransporter,
  closeConnections,
} from './config/connections';
import { initializeQueue, initializeWorker, closeQueue } from './services/queueService';
import prisma from './config/prisma';

const app: Express = express();
const PORT = process.env.PORT || 3000;

/**
 * Initialize middleware
 */
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(securityMiddleware);
app.use(authMiddleware);

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * API Routes
 */
app.use('/api/emails', emailRoutes);

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/**
 * Error handler
 */
app.use(errorHandler);

/**
 * Initialize services and start server
 */
async function start(): Promise<void> {
  try {
    console.log('🚀 Starting ReachInbox Email Scheduler...');

    // Initialize connections
    console.log('📡 Initializing connections...');
    await initializeRedis();
    await initializeEmailTransporter();

    // Initialize BullMQ
    console.log('📬 Initializing BullMQ...');
    await initializeQueue();
    await initializeWorker();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📊 Configuration:`);
      console.log(`   - Max Emails/Hour: ${process.env.MAX_EMAILS_PER_HOUR || 200}`);
      console.log(`   - Delay Between Emails: ${process.env.DELAY_BETWEEN_EMAILS_MS || 2000}ms`);
      console.log(`   - Worker Concurrency: ${process.env.WORKER_CONCURRENCY || 5}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(): Promise<void> {
  console.log('🛑 Shutting down gracefully...');

  try {
    await closeQueue();
    await closeConnections();
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
start();
