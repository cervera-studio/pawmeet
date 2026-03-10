import type { DogPhoto, DogProfile } from '@dogwalk/types';
import { create } from 'zustand';

interface DogsState {
  dogs: DogProfile[];
  photos: Record<string, DogPhoto[]>;
  selectedDogId: string | null;
  setDogs: (dogs: DogProfile[]) => void;
  addDog: (dog: DogProfile) => void;
  updateDog: (id: string, updates: Partial<DogProfile>) => void;
  removeDog: (id: string) => void;
  setSelectedDog: (id: string | null) => void;
  setPhotos: (dogId: string, photos: DogPhoto[]) => void;
}

export const useDogsStore = create<DogsState>((set) => ({
  dogs: [],
  photos: {},
  selectedDogId: null,

  setDogs: (dogs) => set({ dogs }),

  addDog: (dog) =>
    set((state) => ({
      dogs: [...state.dogs, dog],
    })),

  updateDog: (id, updates) =>
    set((state) => ({
      dogs: state.dogs.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),

  removeDog: (id) =>
    set((state) => ({
      dogs: state.dogs.filter((d) => d.id !== id),
    })),

  setSelectedDog: (id) => set({ selectedDogId: id }),

  setPhotos: (dogId, photos) =>
    set((state) => ({
      photos: { ...state.photos, [dogId]: photos },
    })),
}));
