import '../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuthStore } from '@/stores/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

/** Registers for push notifications only when user is authenticated. */
function PushNotificationRegistration() {
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {isAuthenticated && <PushNotificationRegistration />}
          <StatusBar style="auto" />
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="(modals)/dog-detail"
              options={{ presentation: 'modal', title: 'Dettaglio Cane' }}
            />
            <Stack.Screen
              name="(modals)/settings"
              options={{ presentation: 'modal', title: 'Impostazioni' }}
            />
            <Stack.Screen
              name="(modals)/report"
              options={{ presentation: 'modal', title: 'Segnala' }}
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
