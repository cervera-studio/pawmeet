import { Stack } from 'expo-router';

export default function WalksLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="album/[walkId]"
        options={{
          headerShown: true,
          title: 'Album',
          headerBackTitle: 'Passeggiate',
        }}
      />
    </Stack>
  );
}
