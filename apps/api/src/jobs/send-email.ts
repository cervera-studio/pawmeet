import process from 'node:process';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { Resend } from 'resend';
import { FROM_EMAIL } from '../constants/emails.js';
import type { EmailJobData } from './queue.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

export function createEmailWorker() {
  const worker = new Worker<EmailJobData>(
    QUEUE_NAMES.EMAIL,
    async (job) => {
      const { to, subject, html } = job.data;
      logger.info('SendEmail', `Sending to ${to}: ${subject}`);

      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );

  worker.on('completed', (job) => {
    logger.info('SendEmail', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('SendEmail', `Job ${job?.id} failed`, err.message);
  });

  return worker;
}
