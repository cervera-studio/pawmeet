import { create } from 'zustand';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationState {
  coordinates: Coordinates | null;
  isLoading: boolean;
  error: string | null;
  permissionGranted: boolean;
  searchRadiusKm: number;
  setCoordinates: (coords: Coordinates) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPermissionGranted: (granted: boolean) => void;
  setSearchRadiusKm: (radius: number) => void;
  /** Clear coordinates on logout to prevent stale location data */
  clearCoordinates: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  coordinates: null,
  isLoading: false,
  error: null,
  permissionGranted: false,
  searchRadiusKm: 10,

  setCoordinates: (coordinates) => set({ coordinates, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setPermissionGranted: (permissionGranted) => set({ permissionGranted }),
  setSearchRadiusKm: (searchRadiusKm) => set({ searchRadiusKm }),
  clearCoordinates: () => set({ coordinates: null }),
}));
