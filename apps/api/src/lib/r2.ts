import process from 'node:process';
import { S3Client } from '@aws-sdk/client-s3';

const R2_ENDPOINT = process.env.R2_ENDPOINT;
if (!R2_ENDPOINT) throw new Error('R2_ENDPOINT is required');

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
if (!R2_ACCESS_KEY_ID) throw new Error('R2_ACCESS_KEY_ID is required');

const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
if (!R2_SECRET_ACCESS_KEY) throw new Error('R2_SECRET_ACCESS_KEY is required');

export const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});
