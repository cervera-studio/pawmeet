import { useState, useCallback } from 'react';

interface DogProfile {
  id: string;
  name: string;
  breed: string;
  age: string;
  distance: string;
  imageUrl: string | null;
}

export function useMatching() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // TODO: caricare profili da API
  const profiles: DogProfile[] = [
    { id: '1', name: 'Luna', breed: 'Golden Retriever', age: '3 anni', distance: '1.2 km', imageUrl: null },
    { id: '2', name: 'Rex', breed: 'Pastore Tedesco', age: '5 anni', distance: '2.5 km', imageUrl: null },
    { id: '3', name: 'Milo', breed: 'Labrador', age: '2 anni', distance: '0.8 km', imageUrl: null },
  ];

  const currentProfile = profiles[currentIndex] ?? null;

  const swipeRight = useCallback(async () => {
    // TODO: inviare like a API
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const swipeLeft = useCallback(() => {
    // TODO: inviare pass a API
    setCurrentIndex((prev) => prev + 1);
  }, []);

  return {
    currentProfile,
    isLoading,
    swipeRight,
    swipeLeft,
    hasMore: currentIndex < profiles.length,
  };
}
