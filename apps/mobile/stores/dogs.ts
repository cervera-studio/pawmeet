import type { RouterOutput } from '@dogwalk/api-client';
import { create } from 'zustand';

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
