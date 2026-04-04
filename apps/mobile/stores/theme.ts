import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';

type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => {
        set({ preference });
        applyTheme(preference);
      },
    }),
    {
      name: 'pawmeet-theme',
      storage: createJSONStorage(() => mmkvStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.preference);
        }
      },
    },
  ),
);

function applyTheme(preference: ThemePreference) {
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

// Apply theme eagerly before first render to prevent light↔dark flash
const persisted = mmkvStorage.getItem('pawmeet-theme');
if (persisted) {
  try {
    const { state } = JSON.parse(persisted) as { state: ThemeState };
    if (state?.preference) applyTheme(state.preference);
  } catch {
    // corrupted persisted state — ignore
  }
}
