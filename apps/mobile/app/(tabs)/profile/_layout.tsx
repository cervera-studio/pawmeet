import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';

export default function ProfileLayout() {
  const { t } = useTranslation();
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
      <Stack.Screen
        name="dogs/[dogId]"
        options={{
          headerShown: true,
          title: t('modals.dogDetail'),
          headerBackTitle: t('tabs.profile'),
        }}
      />
      <Stack.Screen
        name="dogs/new"
        options={{
          headerShown: true,
          title: t('dogForm.newTitle'),
          headerBackTitle: t('tabs.profile'),
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="activity"
        options={{
          headerShown: true,
          title: t('profile.activity.title'),
          headerBackTitle: t('tabs.profile'),
        }}
      />
      <Stack.Screen
        name="matching-insights"
        options={{
          headerShown: true,
          title: t('profile.matchingInsights.title'),
          headerBackTitle: t('tabs.profile'),
        }}
      />
      <Stack.Screen
        name="followers"
        options={{
          headerShown: true,
          title: t('profile.follower'),
          headerBackTitle: t('tabs.profile'),
        }}
      />
      <Stack.Screen
        name="following"
        options={{
          headerShown: true,
          title: t('profile.following'),
          headerBackTitle: t('tabs.profile'),
        }}
      />
      <Stack.Screen
        name="friends"
        options={{
          headerShown: true,
          title: t('profile.friends'),
          headerBackTitle: t('tabs.profile'),
        }}
      />
      <Stack.Screen
        name="gamification"
        options={{
          headerShown: true,
          title: t('profile.gamification.title'),
          headerBackTitle: t('tabs.profile'),
        }}
      />
      <Stack.Screen
        name="leaderboard"
        options={{
          headerShown: true,
          title: t('profile.gamification.leaderboard'),
          headerBackTitle: t('profile.gamification.title'),
        }}
      />
      <Stack.Screen
        name="achievements"
        options={{
          headerShown: true,
          title: t('profile.gamification.achievements'),
          headerBackTitle: t('profile.gamification.title'),
        }}
      />
      <Stack.Screen
        name="challenges"
        options={{
          headerShown: true,
          title: t('profile.challenges.title'),
          headerBackTitle: t('profile.gamification.title'),
        }}
      />
      <Stack.Screen
        name="dogs/badges"
        options={{
          headerShown: true,
          title: t('profile.dogBadges.title'),
          headerBackTitle: t('modals.dogDetail'),
        }}
      />
      <Stack.Screen
        name="mood-history"
        options={{
          headerShown: true,
          title: t('moodHistory.title'),
          headerBackTitle: t('modals.dogDetail'),
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: true,
          title: t('profile.menu.notifications'),
          headerBackTitle: t('tabs.profile'),
        }}
      />
    </Stack>
  );
}
