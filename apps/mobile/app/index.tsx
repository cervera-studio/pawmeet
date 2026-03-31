import { Redirect } from 'expo-router';

import { useAuthStore } from '@/stores/auth';

/**
 * Root index route — required by Expo Router to handle the `pawmeet:///` URL.
 * Redirects immediately based on auth state.
 */
export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const requiresAgeVerification = useAuthStore((s) => s.requiresAgeVerification);
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted);

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (requiresAgeVerification) {
    return <Redirect href="/(modals)/age-gate" />;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(modals)/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
