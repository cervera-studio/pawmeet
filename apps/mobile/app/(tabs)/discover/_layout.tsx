import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function DiscoverLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: isDark ? '#1C1C1E' : '#fff' },
        headerTintColor: isDark ? '#F5F5F7' : '#1f2937',
        contentStyle: { backgroundColor: isDark ? '#1C1C1E' : '#fff' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="feed" />
    </Stack>
  );
}
