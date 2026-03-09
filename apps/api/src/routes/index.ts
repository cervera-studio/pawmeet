import { Hono } from 'hono';
import { authRoutes } from './auth.js';
import { dogRoutes } from './dogs.js';
import { matchRoutes } from './matches.js';
import { chatRoutes } from './chat.js';
import { userRoutes } from './users.js';

export const routes = new Hono()
  .route('/auth', authRoutes)
  .route('/dogs', dogRoutes)
  .route('/matches', matchRoutes)
  .route('/chat', chatRoutes)
  .route('/users', userRoutes);

export type AppType = typeof routes;
