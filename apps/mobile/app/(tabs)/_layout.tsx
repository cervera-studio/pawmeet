import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scopri',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🐾</Text>,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mappa',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>📍</Text>,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Match',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>💛</Text>,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>💬</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
