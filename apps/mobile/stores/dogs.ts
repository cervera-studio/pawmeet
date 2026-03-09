import { create } from 'zustand';

interface Dog {
  id: string;
  name: string;
  breed: string;
  age: number;
  bio?: string;
  size: 'small' | 'medium' | 'large';
  energy: 'low' | 'medium' | 'high';
  temperament: string[];
  photos: string[];
}

interface DogsState {
  dogs: Dog[];
  selectedDogId: string | null;
  setDogs: (dogs: Dog[]) => void;
  addDog: (dog: Dog) => void;
  updateDog: (id: string, updates: Partial<Dog>) => void;
  removeDog: (id: string) => void;
  setSelectedDog: (id: string | null) => void;
}

export const useDogsStore = create<DogsState>((set) => ({
  dogs: [],
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
}));
