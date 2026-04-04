import { useTranslation } from 'react-i18next';
import { Pressable, Text, useColorScheme, View } from 'react-native';

const TABS = {
  MESSAGES: 'messages',
  GROUPS: 'groups',
} as const;

type Tab = (typeof TABS)[keyof typeof TABS];

export function SegmentControl({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  const activeBg = isDark ? '#48484A' : '#FFFFFF';
  const activeText = isDark ? '#F5F5F7' : '#111827';
  const inactiveText = isDark ? '#8E8E93' : '#6B7280';
  const trackBg = isDark ? '#2C2C2E' : '#F3F4F6';

  return (
    <View
      style={{
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        backgroundColor: trackBg,
        padding: 4,
      }}
    >
      <Pressable
        onPress={() => onTabChange(TABS.MESSAGES)}
        style={{
          flex: 1,
          alignItems: 'center',
          borderRadius: 8,
          paddingVertical: 8,
          backgroundColor: activeTab === TABS.MESSAGES ? activeBg : 'transparent',
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: activeTab === TABS.MESSAGES ? activeText : inactiveText,
          }}
        >
          {t('chat.tabMessages')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onTabChange(TABS.GROUPS)}
        style={{
          flex: 1,
          alignItems: 'center',
          borderRadius: 8,
          paddingVertical: 8,
          backgroundColor: activeTab === TABS.GROUPS ? activeBg : 'transparent',
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: activeTab === TABS.GROUPS ? activeText : inactiveText,
          }}
        >
          {t('chat.tabGroups')}
        </Text>
      </Pressable>
    </View>
  );
}
