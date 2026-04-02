import { router } from '../../trpc.js';
import { createAdminBreedsRouter } from './admin-breeds-router.js';
import { createAdminDogsRouter } from './admin-dogs-router.js';
import { createAdminEventsRouter } from './admin-events-router.js';
import { createAdminFeedRouter } from './admin-feed-router.js';
import { createAdminNotificationsRouter } from './admin-notifications-router.js';
import { createAdminOrganizationsRouter } from './admin-organizations-router.js';
import { createAdminPhotosRouter } from './admin-photos-router.js';
import { createAdminReportsRouter } from './admin-reports-router.js';
import { createAdminSafetyRouter } from './admin-safety-router.js';
import { createAdminSponsorsRouter } from './admin-sponsors-router.js';
import type { ModerationRouterDeps } from './types.js';

export type { ModerationRouterDeps } from './types.js';

export function createAdminModerationRouter(deps: ModerationRouterDeps) {
  return router({
    ...createAdminDogsRouter(deps)._def.procedures,
    ...createAdminReportsRouter(deps)._def.procedures,
    ...createAdminFeedRouter(deps)._def.procedures,
    ...createAdminPhotosRouter(deps)._def.procedures,
    ...createAdminEventsRouter(deps)._def.procedures,
    ...createAdminOrganizationsRouter(deps)._def.procedures,
    ...createAdminSponsorsRouter(deps)._def.procedures,
    ...createAdminSafetyRouter(deps)._def.procedures,
    ...createAdminBreedsRouter(deps)._def.procedures,
    ...createAdminNotificationsRouter(deps)._def.procedures,
  });
}
