import { Worker } from 'bullmq';
import { Resend } from 'resend';
import type { EmailJobData } from './queue.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

const FROM_EMAIL = process.env.FROM_EMAIL || 'PawMeet <noreply@pawmeet.io>';

export function createEmailWorker() {
  const worker = new Worker<EmailJobData>(
    QUEUE_NAMES.EMAIL,
    async (job) => {
      const { to, subject, html } = job.data;
      console.log(`[email] Sending to ${to}: ${subject}`);

      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );

  worker.on('completed', (job) => {
    console.log(`[email] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[email] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
