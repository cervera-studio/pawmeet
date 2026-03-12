import type { RouterOutput } from '@pawmeet/api-client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';

type Dog = RouterOutput['dogs']['list']['dogs'][number];
type DogPhoto = RouterOutput['dogs']['uploadPhotoUrl'];

interface DogsState {
  dogs: Dog[];
  photos: Record<string, DogPhoto[]>;
  selectedDogId: string | null;
  setDogs: (dogs: Dog[]) => void;
  addDog: (dog: Dog) => void;
  updateDog: (id: string, updates: Partial<Dog>) => void;
  removeDog: (id: string) => void;
  setSelectedDog: (id: string | null) => void;
  setPhotos: (dogId: string, photos: DogPhoto[]) => void;
}

export const useDogsStore = create<DogsState>()(
  persist(
    (set) => ({
      dogs: [],
      photos: {},
      selectedDogId: null,

      setDogs: (dogs) =>
        set((state) => {
          // Auto-select first dog if none is selected or current selection is invalid
          const needsAutoSelect =
            !state.selectedDogId || !dogs.some((d) => d.id === state.selectedDogId);
          return {
            dogs,
            ...(needsAutoSelect && dogs.length > 0 ? { selectedDogId: dogs[0]?.id ?? null } : {}),
          };
        }),

      addDog: (dog) =>
        set((state) => ({
          dogs: [...state.dogs, dog],
          // Auto-select when first dog is added
          ...(state.dogs.length === 0 ? { selectedDogId: dog.id } : {}),
        })),

      updateDog: (id, updates) =>
        set((state) => ({
          dogs: state.dogs.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),

      removeDog: (id) =>
        set((state) => {
          const remaining = state.dogs.filter((d) => d.id !== id);
          return {
            dogs: remaining,
            // If the removed dog was selected, auto-select the first remaining dog
            ...(state.selectedDogId === id ? { selectedDogId: remaining[0]?.id ?? null } : {}),
          };
        }),

      setSelectedDog: (id) => set({ selectedDogId: id }),

      setPhotos: (dogId, photos) =>
        set((state) => ({
          photos: { ...state.photos, [dogId]: photos },
        })),
    }),
    {
      name: 'pawmeet-dogs',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        dogs: state.dogs,
        photos: state.photos,
        selectedDogId: state.selectedDogId,
      }),
    },
  ),
);
