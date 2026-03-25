import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function EventsLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[eventId]"
        options={{
          headerShown: true,
          title: t('events.detail.title'),
          headerBackTitle: t('events.detail.backButton'),
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          headerShown: true,
          title: t('events.create.title'),
          headerBackTitle: t('events.create.backButton'),
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
