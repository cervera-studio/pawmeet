import { Pressable, Text, View } from 'react-native';

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
  return (
    <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, backgroundColor: '#F3F4F6', padding: 4 }}>
      <Pressable
        onPress={() => onTabChange(TABS.MESSAGES)}
        style={{
          flex: 1,
          alignItems: 'center',
          borderRadius: 8,
          paddingVertical: 8,
          backgroundColor: activeTab === TABS.MESSAGES ? '#FFFFFF' : 'transparent',
        }}
      >
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: activeTab === TABS.MESSAGES ? '#111827' : '#6B7280',
        }}>
          Messaggi
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onTabChange(TABS.GROUPS)}
        style={{
          flex: 1,
          alignItems: 'center',
          borderRadius: 8,
          paddingVertical: 8,
          backgroundColor: activeTab === TABS.GROUPS ? '#FFFFFF' : 'transparent',
        }}
      >
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: activeTab === TABS.GROUPS ? '#111827' : '#6B7280',
        }}>
          Gruppi
        </Text>
      </Pressable>
    </View>
  );
}
