import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';

/**
 * Biometric lock hook — gates app access behind Face ID / Touch ID
 * when the user returns from background.
 *
 * Returns `isLocked` — when true, the UI should show a lock overlay.
 */
export function useBiometricLock() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const biometricEnabled = useSettingsStore((s) => s.biometricLockEnabled);
  const timeoutMinutes = useSettingsStore((s) => s.biometricTimeoutMinutes);

  const [isLocked, setIsLocked] = useState(false);
  const lastAuthRef = useRef(Date.now());
  const backgroundAtRef = useRef<number | null>(null);

  const authenticate = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      setIsLocked(false);
      return;
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      setIsLocked(false);
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sblocca PawMeet',
      cancelLabel: 'Annulla',
      disableDeviceFallback: false,
    });

    if (result.success) {
      lastAuthRef.current = Date.now();
      setIsLocked(false);
    }
    // If cancelled, stay locked — user can retry by tapping the lock overlay
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !biometricEnabled) {
      setIsLocked(false);
      return;
    }

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundAtRef.current = Date.now();
        return;
      }

      if (nextState === 'active' && backgroundAtRef.current !== null) {
        const awayMs = Date.now() - backgroundAtRef.current;
        const awayMinutes = awayMs / (1000 * 60);
        backgroundAtRef.current = null;

        // Skip if returning within the grace period (e.g. camera, file picker)
        const timeSinceLastAuth = (Date.now() - lastAuthRef.current) / (1000 * 60);
        if (awayMinutes < 0.5 || timeSinceLastAuth < timeoutMinutes) {
          return;
        }

        setIsLocked(true);
      }
    });

    return () => sub.remove();
  }, [isAuthenticated, biometricEnabled, timeoutMinutes]);

  return { isLocked, authenticate };
}
