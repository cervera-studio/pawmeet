import type { Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { PasskeyRepository } from '../ports/passkey-repository.js';

interface Deps {
  passkeyRepo: PasskeyRepository;
}

export interface PasskeySummary {
  id: string;
  friendlyName: string | null;
  deviceType: string;
  backedUp: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export function createPasskeyList(deps: Deps) {
  return async (userId: string): Promise<Result<PasskeySummary[]>> => {
    const credentials = await deps.passkeyRepo.findByUserId(userId);
    return succeed(
      credentials.map((c) => ({
        id: c.id,
        friendlyName: c.friendlyName,
        deviceType: c.deviceType,
        backedUp: c.backedUp,
        createdAt: c.createdAt,
        lastUsedAt: c.lastUsedAt,
      })),
    );
  };
}
