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
        listeners={({ navigation }) => ({
          // Tapping the Chat tab always returns to the conversations list,
          // so users aren't dropped back into the last open chat when they
          // only have one active — they want to see the list first.
          tabPress: (e) => {
            const state = navigation.getState();
            const chatRoute = state.routes.find((r: { name: string }) => r.name === 'chat');
            const nestedIndex = (chatRoute as { state?: { index?: number } })?.state?.index ?? 0;
            if (nestedIndex > 0) {
              e.preventDefault();
              navigation.navigate('chat', { screen: 'index' });
            }
          },
        })}
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
