import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function WalksLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="suggestions" />
      <Stack.Screen
        name="tracking"
        options={{
          headerShown: true,
          title: t('walks.tracking.title'),
          headerBackTitle: t('tabs.walks'),
        }}
      />
      <Stack.Screen
        name="album/[walkId]"
        options={{
          headerShown: true,
          title: t('feed.walkAlbum'),
          headerBackTitle: t('tabs.walks'),
        }}
      />
    </Stack>
  );
}
