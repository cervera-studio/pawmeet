import { logger } from '@pawmeet/utils';
import { Hono } from 'hono';
import * as jose from 'jose';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { OAuthAccountRepository } from '../ports/oauth-account-repository.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';
const appleJwks = jose.createRemoteJWKSet(new URL(APPLE_JWKS_URI));

interface AppleServerEvent {
  type: 'email-disabled' | 'email-enabled' | 'consent-revoked' | 'account-delete';
  sub: string;
  email?: string;
  is_private_email?: string;
  event_time: number;
}

interface Deps {
  oauthAccountRepo: OAuthAccountRepository;
  userRepo: UserRepository;
  tokenRepo: TokenRepository;
}

/**
 * Apple Sign In server-to-server notifications.
 * Apple sends a JWT payload when a user revokes consent, deletes their account,
 * or changes their email preferences.
 *
 * @see https://developer.apple.com/documentation/sign_in_with_apple/processing_changes_for_sign_in_with_apple_accounts
 */
export function createAppleAuthWebhook(deps: Deps) {
  const app = new Hono();

  app.post('/', async (c) => {
    const body = await c.req.parseBody();
    const payload = body.payload as string | undefined;

    if (!payload) {
      return c.json({ error: 'Missing payload' }, 400);
    }

    // Verify the JWT from Apple
    let event: AppleServerEvent;
    try {
      const { payload: jwtPayload } = await jose.jwtVerify(payload, appleJwks, {
        issuer: 'https://appleid.apple.com',
      });

      const events = jwtPayload.events as string | undefined;
      if (!events) {
        return c.json({ error: 'Missing events claim' }, 400);
      }

      event = JSON.parse(events) as AppleServerEvent;

      // Replay protection: reject events older than 5 minutes
      const MAX_EVENT_AGE_MS = 5 * 60 * 1000;
      if (
        event.event_time &&
        Math.abs(Date.now() - event.event_time * 1000) > MAX_EVENT_AGE_MS
      ) {
        logger.warn('AppleWebhook', `Stale event rejected (event_time: ${event.event_time})`);
        return c.json({ error: 'Event too old' }, 400);
      }
    } catch (err) {
      logger.warn('AppleWebhook', 'Failed to verify Apple JWT', err);
      return c.json({ error: 'Invalid JWT' }, 401);
    }

    const { oauthAccountRepo, userRepo, tokenRepo } = deps;

    // Find the linked account by Apple sub
    const link = await oauthAccountRepo.findByProviderUid('apple', event.sub);
    if (!link) {
      logger.warn('AppleWebhook', `No linked account for Apple sub ${event.sub}`);
      return c.json({ ok: true });
    }

    switch (event.type) {
      case 'consent-revoked': {
        // User revoked Sign in with Apple — unlink and revoke sessions
        await oauthAccountRepo.deleteByUserAndProvider(link.userId, 'apple');
        await tokenRepo.revokeAllUserRefreshTokens(link.userId);

        logSecurityEvent({
          event: SECURITY_EVENT.AccountLinked,
          userId: link.userId,
          metadata: { provider: 'apple', action: 'consent_revoked' },
        });

        logger.info('AppleWebhook', `Consent revoked for user ${link.userId}`);
        break;
      }

      case 'account-delete': {
        // User deleted their Apple account — check if Apple is the only auth method
        const allLinks = await oauthAccountRepo.findByUserId(link.userId);
        const user = await userRepo.findById(link.userId);
        const hasPassword = user?.passwordHash != null;
        const hasOtherProvider = allLinks.some((l) => l.provider !== 'apple' && l.id !== link.id);

        // Remove the Apple link
        await oauthAccountRepo.deleteByUserAndProvider(link.userId, 'apple');

        if (hasPassword || hasOtherProvider) {
          logger.info(
            'AppleWebhook',
            `Apple unlinked for user ${link.userId}, other auth methods remain`,
          );
        } else {
          // Apple was the only auth method — schedule account deletion
          const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await userRepo.update(link.userId, {
            isActive: false,
            deletionScheduledAt: deletionDate,
          });
          await tokenRepo.revokeAllUserRefreshTokens(link.userId);

          logger.info('AppleWebhook', `Apple-only user ${link.userId} scheduled for deletion`);
        }
        break;
      }

      case 'email-disabled': {
        // Private relay email disabled — log but don't break the account
        logger.info('AppleWebhook', `Email relay disabled for user ${link.userId}`);
        break;
      }

      case 'email-enabled': {
        logger.info('AppleWebhook', `Email relay re-enabled for user ${link.userId}`);
        break;
      }
    }

    return c.json({ ok: true });
  });

  return app;
}
