import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function DiscoverLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="feed" />
    </Stack>
  );
}
