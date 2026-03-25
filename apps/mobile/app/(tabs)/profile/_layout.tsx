import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="dogs/[dogId]"
        options={{
          headerShown: true,
          title: 'Dettaglio cane',
          headerBackTitle: 'Profilo',
        }}
      />
      <Stack.Screen
        name="dogs/new"
        options={{
          headerShown: true,
          title: 'Nuovo cane',
          headerBackTitle: 'Profilo',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="activity"
        options={{
          headerShown: true,
          title: 'Attività',
          headerBackTitle: 'Profilo',
        }}
      />
      <Stack.Screen
        name="matching-insights"
        options={{
          headerShown: true,
          title: 'Statistiche Matching',
          headerBackTitle: 'Profilo',
        }}
      />
      <Stack.Screen
        name="followers"
        options={{
          headerShown: true,
          title: 'Follower',
          headerBackTitle: 'Profilo',
        }}
      />
      <Stack.Screen
        name="following"
        options={{
          headerShown: true,
          title: 'Seguiti',
          headerBackTitle: 'Profilo',
        }}
      />
      <Stack.Screen
        name="friends"
        options={{
          headerShown: true,
          title: 'Amici',
          headerBackTitle: 'Profilo',
        }}
      />
      <Stack.Screen
        name="gamification"
        options={{
          headerShown: true,
          title: 'Gamification',
          headerBackTitle: 'Profilo',
        }}
      />
      <Stack.Screen
        name="leaderboard"
        options={{
          headerShown: true,
          title: 'Classifica',
          headerBackTitle: 'Gamification',
        }}
      />
      <Stack.Screen
        name="achievements"
        options={{
          headerShown: true,
          title: 'Obiettivi',
          headerBackTitle: 'Gamification',
        }}
      />
      <Stack.Screen
        name="challenges"
        options={{
          headerShown: true,
          title: 'Sfide',
          headerBackTitle: 'Gamification',
        }}
      />
      <Stack.Screen
        name="dogs/badges"
        options={{
          headerShown: true,
          title: 'Badge',
          headerBackTitle: 'Dettaglio',
        }}
      />
      <Stack.Screen
        name="mood-history"
        options={{
          headerShown: true,
          title: 'Storico umore',
          headerBackTitle: 'Dettaglio',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: true,
          title: 'Notifiche',
          headerBackTitle: 'Profilo',
        }}
      />
    </Stack>
  );
}
