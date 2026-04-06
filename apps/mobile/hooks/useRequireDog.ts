import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useDogsStore } from '@/stores/dogs';

/**
 * Gate hook for features that require at least one dog profile.
 *
 * Usage:
 *   const { hasDog, showGate, dismissGate, goToAddDog } = useRequireDog();
 *   // In JSX: {showGate && <RequireDogModal onDismiss={dismissGate} onAdd={goToAddDog} />}
 *   // Before action: if (!hasDog) return; // gate will show automatically
 */
export function useRequireDog() {
  const dogs = useDogsStore((s) => s.dogs);
  const hasDog = dogs.length > 0;
  const [showGate, setShowGate] = useState(false);
  const router = useRouter();

  const guardAction = useCallback(
    (action: () => void) => {
      if (hasDog) {
        action();
      } else {
        setShowGate(true);
      }
    },
    [hasDog],
  );

  const dismissGate = useCallback(() => setShowGate(false), []);

  const goToAddDog = useCallback(() => {
    setShowGate(false);
    router.push('/(modals)/add-dog');
  }, [router]);

  return { hasDog, showGate, setShowGate, dismissGate, goToAddDog, guardAction };
}
