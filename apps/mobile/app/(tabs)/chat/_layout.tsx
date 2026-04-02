import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function ChatLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[matchId]"
        options={{
          headerShown: true,
          title: t('tabs.chat'),
          headerBackTitle: t('chat.backButton'),
        }}
      />
    </Stack>
  );
}
