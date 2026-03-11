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
    </Stack>
  );
}
