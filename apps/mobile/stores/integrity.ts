import { create } from 'zustand';

interface IntegrityState {
  token: string | null;
  setToken: (token: string | null) => void;
}

export const useIntegrityStore = create<IntegrityState>()((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}));
