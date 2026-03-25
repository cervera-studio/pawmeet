import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, useColorScheme } from 'react-native';
import { useChat } from '@/hooks/useChat';

export default function TabLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { totalUnreadCount } = useChat();

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
        name="discover"
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
        name="chat"
        options={{
          title: t('tabs.chat'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>{'\uD83D\uDCAC'}</Text>,
          tabBarBadge: totalUnreadCount > 0 ? totalUnreadCount : undefined,
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
