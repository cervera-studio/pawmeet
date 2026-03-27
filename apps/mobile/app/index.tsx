import { Redirect } from 'expo-router';

import { useAuthStore } from '@/stores/auth';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const requiresAgeVerification = useAuthStore((s) => s.requiresAgeVerification);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (requiresAgeVerification) {
    return <Redirect href="/(modals)/age-gate" />;
  }

  return <Redirect href="/(tabs)" />;
}
