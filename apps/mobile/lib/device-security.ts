import { File } from 'expo-file-system';
import { Platform } from 'react-native';

interface DeviceIntegrityResult {
  isCompromised: boolean;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Android root indicators
// ---------------------------------------------------------------------------

const ANDROID_ROOT_PATHS = [
  '/system/xbin/su',
  '/system/bin/su',
  '/system/app/Superuser.apk',
  '/system/app/SuperSU.apk',
  '/sbin/su',
  '/data/local/xbin/su',
  '/data/local/bin/su',
  '/data/local/su',
  // Magisk files
  '/sbin/.magisk',
  '/data/adb/magisk',
  '/data/adb/magisk.db',
] as const;

// ---------------------------------------------------------------------------
// iOS jailbreak indicators
// ---------------------------------------------------------------------------

const IOS_JAILBREAK_PATHS = [
  '/Applications/Cydia.app',
  '/Library/MobileSubstrate/MobileSubstrate.dylib',
  '/bin/bash',
  '/usr/sbin/sshd',
  '/etc/apt',
  '/private/var/lib/apt/',
  '/private/var/lib/cydia',
  '/private/var/stash',
  '/usr/bin/ssh',
] as const;

/**
 * Check whether a file exists using expo-file-system.
 * Returns false on any error (permission denied, etc.).
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    const file = new File(`file://${path}`);
    return file.exists;
  } catch {
    return false;
  }
}

/**
 * Checks the device for root (Android) or jailbreak (iOS) indicators.
 *
 * This is a best-effort heuristic check. Sophisticated root/jailbreak tools
 * can hide their presence. The result should be used for logging and monitoring,
 * NOT for blocking user access.
 *
 * @returns An object indicating whether the device appears compromised and why.
 */
export async function checkDeviceIntegrity(): Promise<DeviceIntegrityResult> {
  const reasons: string[] = [];

  const pathsToCheck = Platform.OS === 'android' ? ANDROID_ROOT_PATHS : IOS_JAILBREAK_PATHS;

  const results = await Promise.all(
    pathsToCheck.map(async (filePath) => {
      const exists = await fileExists(filePath);
      return { filePath, exists };
    }),
  );

  for (const { filePath, exists } of results) {
    if (exists) {
      reasons.push(`Suspicious path found: ${filePath}`);
    }
  }

  return {
    isCompromised: reasons.length > 0,
    reasons,
  };
}
