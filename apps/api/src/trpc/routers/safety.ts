import {
  createEmergencyContactSchema,
  deleteEmergencyContactSchema,
  walkCheckinSchema,
  walkSosSchema,
} from '@pawmeet/validation';
import type { emergencyContactDeps } from '../../container.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

export function createSafetyRouter(deps: typeof emergencyContactDeps) {
  return router({
    addEmergencyContact: protectedProcedure
      .input(createEmergencyContactSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.addEmergencyContact(ctx.userId, input)),
      ),

    listEmergencyContacts: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.listEmergencyContacts(ctx.userId)),
    ),

    deleteEmergencyContact: protectedProcedure
      .input(deleteEmergencyContactSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.deleteEmergencyContact(ctx.userId, input.contactId)),
      ),

    sos: protectedProcedure.input(walkSosSchema).mutation(async ({ ctx, input }) =>
      unwrapResult(
        await deps.walkSos(ctx.userId, input.walkId, input.latitude, input.longitude),
      ),
    ),

    checkin: protectedProcedure.input(walkCheckinSchema).mutation(async ({ ctx, input }) =>
      unwrapResult(await deps.walkCheckin(ctx.userId, input.walkId)),
    ),
  });
}
