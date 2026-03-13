import * as ScreenCapture from 'expo-screen-capture';
import { useEffect } from 'react';

/**
 * Prevents screenshots and screen recording while the component is mounted.
 *
 * On Android, this activates FLAG_SECURE at the window level.
 * On iOS, this uses the system screen recording prevention API.
 *
 * Call this hook in any screen that displays sensitive content
 * (e.g., chat conversations, media viewer).
 */
export function usePreventScreenCapture() {
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync();

    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);
}
