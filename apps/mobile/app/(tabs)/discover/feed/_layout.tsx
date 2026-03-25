import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function FeedLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[postId]"
        options={{
          headerShown: true,
          title: t('feed.postTitle'),
          headerBackTitle: t('feed.backButton'),
        }}
      />
      <Stack.Screen
        name="walk-album"
        options={{
          headerShown: true,
          title: t('feed.walkAlbum'),
          headerBackTitle: t('feed.backButton'),
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          headerShown: true,
          title: t('feed.create.title'),
          headerBackTitle: t('feed.backButton'),
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="hashtag"
        options={{
          headerShown: true,
          headerBackTitle: t('feed.backButton'),
        }}
      />
    </Stack>
  );
}
