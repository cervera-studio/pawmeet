import { create } from 'zustand';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationState {
  coordinates: Coordinates | null;
  isLoading: boolean;
  error: string | null;
  permissionGranted: boolean;
  setCoordinates: (coords: Coordinates) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPermissionGranted: (granted: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  coordinates: null,
  isLoading: false,
  error: null,
  permissionGranted: false,

  setCoordinates: (coordinates) => set({ coordinates, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setPermissionGranted: (permissionGranted) => set({ permissionGranted }),
}));
