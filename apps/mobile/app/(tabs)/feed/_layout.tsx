import { Stack } from 'expo-router';

export default function FeedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[postId]"
        options={{
          headerShown: true,
          title: 'Post',
          headerBackTitle: 'Feed',
        }}
      />
      <Stack.Screen
        name="walk-album"
        options={{
          headerShown: true,
          title: 'Album passeggiata',
          headerBackTitle: 'Feed',
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          headerShown: true,
          title: 'Nuovo post',
          headerBackTitle: 'Feed',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
