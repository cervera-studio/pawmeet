import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, useColorScheme } from 'react-native';

export default function TabLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#065F46',
        tabBarInactiveTintColor: isDark ? '#8E8E93' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#38383A' : '#F3F4F6',
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
          title: t('tabs.discover'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🐾</Text>,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('tabs.map'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>📍</Text>,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: t('tabs.feed'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>📸</Text>,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: t('tabs.match'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>💛</Text>,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('tabs.chat'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>💬</Text>,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: t('tabs.events'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="walks"
        options={{
          title: t('tabs.walks'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🗓️</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
