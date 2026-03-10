import { Stack } from 'expo-router';

export default function EventsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[eventId]"
        options={{
          headerShown: true,
          title: 'Dettaglio evento',
          headerBackTitle: 'Eventi',
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          headerShown: true,
          title: 'Nuovo evento',
          headerBackTitle: 'Eventi',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
