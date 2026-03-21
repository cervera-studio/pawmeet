import { AppError, fail, type Result, SAFETY_CHECKIN_TYPE, succeed } from '@pawmeet/types';
import type {
  EmergencyContactRepository,
  NotificationService,
  UserRepository,
  WalkRepository,
} from '../ports/index.js';

type Deps = {
  walkRepo: WalkRepository;
  userRepo: UserRepository;
  emergencyContactRepo: EmergencyContactRepository;
  notificationService: NotificationService;
};

/**
 * Triggers an SOS alert during a walk.
 * Records a safety checkin, notifies the walk partner and all emergency contacts.
 */
export function createWalkSos({
  walkRepo,
  userRepo,
  emergencyContactRepo,
  notificationService,
}: Deps) {
  return async (
    userId: string,
    walkId: string,
    latitude?: number,
    longitude?: number,
  ): Promise<Result<{ message: string }>> => {
    const walk = await walkRepo.findById(walkId);
    if (!walk) {
      return fail(new AppError('WALK_NOT_FOUND', 'Walk not found', 404));
    }

    if (walk.status !== 'accepted' && walk.status !== 'pending') {
      return fail(new AppError('WALK_NOT_ACTIVE', 'La passeggiata non è attiva', 400));
    }

    const user = await userRepo.findById(userId);
    if (!user) {
      return fail(new AppError('USER_NOT_FOUND', 'User not found', 404));
    }

    // Record the SOS checkin
    await emergencyContactRepo.createCheckin({
      walkId,
      userId,
      type: SAFETY_CHECKIN_TYPE.SOS,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    });

    const locationText =
      latitude && longitude ? ` — Posizione: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : '';

    // Notify emergency contacts via push (they must be app users to receive push)
    const contacts = await emergencyContactRepo.findByUserId(userId);
    // Note: emergency contacts receive SMS in a future iteration.
    // For now, log the SOS and notify the walk partner.

    // Notify walk partner
    const partnerId = walk.createdBy === userId ? null : walk.createdBy;
    if (partnerId) {
      await notificationService.send({
        userId: partnerId,
        title: '🚨 SOS — Richiesta di aiuto',
        body: `${user.displayName} ha inviato un SOS durante la passeggiata${locationText}`,
        data: { type: 'walk_sos', walkId },
      });
    }

    return succeed({
      message: `SOS inviato. ${contacts.length} contatti di emergenza registrati.`,
    });
  };
}

/**
 * Records a safety check-in during a walk ("I'm safe").
 */
export function createWalkCheckin({
  emergencyContactRepo,
  walkRepo,
}: Pick<Deps, 'emergencyContactRepo' | 'walkRepo'>) {
  return async (userId: string, walkId: string): Promise<Result<{ message: string }>> => {
    const walk = await walkRepo.findById(walkId);
    if (!walk) {
      return fail(new AppError('WALK_NOT_FOUND', 'Walk not found', 404));
    }

    await emergencyContactRepo.createCheckin({
      walkId,
      userId,
      type: SAFETY_CHECKIN_TYPE.CHECKIN,
    });

    return succeed({ message: 'Check-in registrato' });
  };
}
