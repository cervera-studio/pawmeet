import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';

interface SettingsState {
  biometricLockEnabled: boolean;
  /** Minutes before re-prompting biometric after last successful auth */
  biometricTimeoutMinutes: number;
  setBiometricLockEnabled: (enabled: boolean) => void;
  setBiometricTimeoutMinutes: (minutes: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      biometricLockEnabled: false,
      biometricTimeoutMinutes: 5,
      setBiometricLockEnabled: (biometricLockEnabled) => set({ biometricLockEnabled }),
      setBiometricTimeoutMinutes: (biometricTimeoutMinutes) => set({ biometricTimeoutMinutes }),
    }),
    {
      name: 'pawmeet-settings',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
