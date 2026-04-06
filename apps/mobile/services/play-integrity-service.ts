import { logger } from '@pawmeet/utils';
import { Platform, TurboModuleRegistry } from 'react-native';

const isAppIntegrityAvailable = TurboModuleRegistry.get('ExpoAppIntegrity') != null;

const appIntegrity = isAppIntegrityAvailable
  ? (require('@expo/app-integrity') as typeof import('@expo/app-integrity'))
  : null;

const CLOUD_PROJECT_NUMBER = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER ?? '';

let providerReady = false;

/**
 * Initializes the Play Integrity token provider. Call once at app start.
 * No-ops on iOS.
 */
export async function preparePlayIntegrity(): Promise<void> {
  if (!appIntegrity || Platform.OS !== 'android' || !CLOUD_PROJECT_NUMBER) return;

  try {
    await appIntegrity.prepareIntegrityTokenProviderAsync(CLOUD_PROJECT_NUMBER);
    providerReady = true;
    logger.debug('PlayIntegrity', 'Token provider ready');
  } catch (err) {
    logger.warn('PlayIntegrity', 'Failed to prepare token provider', err);
  }
}

/**
 * Requests a Play Integrity token bound to the given request hash.
 * Returns `undefined` on iOS or if the provider is not ready.
 */
export async function requestIntegrityToken(requestHash: string): Promise<string | undefined> {
  if (!appIntegrity || Platform.OS !== 'android' || !providerReady) return;

  try {
    return await appIntegrity.requestIntegrityCheckAsync(requestHash);
  } catch (err) {
    logger.warn('PlayIntegrity', 'Failed to request integrity token', err);
    return;
  }
}
