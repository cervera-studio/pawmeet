import { logger } from '@pawmeet/utils';
import { attestKey } from 'expo-app-integrity';
import { Platform } from 'react-native';

const CLOUD_PROJECT_NUMBER = Number(process.env.EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER ?? '0');

/**
 * Requests a Play Integrity token bound to the given challenge.
 * Returns `undefined` on iOS or if not configured.
 */
export async function requestIntegrityToken(challenge: string): Promise<string | undefined> {
  if (Platform.OS !== 'android' || !CLOUD_PROJECT_NUMBER) return;

  try {
    return await attestKey(challenge, CLOUD_PROJECT_NUMBER);
  } catch (err) {
    logger.warn('PlayIntegrity', 'Failed to request integrity token', err);
    return;
  }
}
