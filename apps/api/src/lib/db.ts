import process from 'node:process';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is required');

const pool = new pg.Pool({ connectionString: DATABASE_URL });
export const db = drizzle(pool);
