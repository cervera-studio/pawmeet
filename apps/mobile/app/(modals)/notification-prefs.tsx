import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SettingsRow } from '@/components/SettingsRow';
import { useSettingsViewModel } from './_vm/settings.view-model';

export default function NotificationPrefsScreen() {
  const { t } = useTranslation();
  const vm = useSettingsViewModel();
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);

  const handleTimeChange = useCallback(
    (_event: unknown, date?: Date) => {
      if (!(date && showTimePicker)) {
        setShowTimePicker(null);
        return;
      }
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      vm.updateQuietHours({ [showTimePicker]: `${hh}:${mm}` });
      if (Platform.OS === 'android') setShowTimePicker(null);
    },
    [showTimePicker, vm],
  );

  const parseTime = (time: string): Date => {
    const parts = time.split(':').map(Number);
    const d = new Date();
    d.setHours(parts[0] ?? 0, parts[1] ?? 0, 0, 0);
    return d;
  };

  return (
    <>
      <Stack.Screen options={{ title: t('settings.notifications.screenTitle') }} />
      <ScrollView
        className="flex-1 bg-white dark:bg-[#1C1C1E]"
        contentContainerClassName="px-6 py-4"
      >
        {/* Notification toggles card */}
        <View className="rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] px-4 mb-6">
          <SettingsRow
            title={t('settings.notifications.newMatches')}
            subtitle={t('settings.notifications.newMatchesDescription')}
            value={vm.prefs.matches}
            onToggle={(v) => vm.updatePref('matches', v)}
          />
          <View className="border-b border-gray-200 dark:border-[#38383A]" />
          <SettingsRow
            title={t('settings.notifications.messages')}
            subtitle={t('settings.notifications.messagesDescription')}
            value={vm.prefs.messages}
            onToggle={(v) => vm.updatePref('messages', v)}
          />
          <View className="border-b border-gray-200 dark:border-[#38383A]" />
          <SettingsRow
            title={t('settings.notifications.walkReminders')}
            subtitle={t('settings.notifications.walkRemindersDescription')}
            value={vm.prefs.reminders}
            onToggle={(v) => vm.updatePref('reminders', v)}
          />
          <View className="border-b border-gray-200 dark:border-[#38383A]" />
          <SettingsRow
            title={t('settings.notifications.feedAndStories')}
            subtitle={t('settings.notifications.feedAndStoriesDescription')}
            value={vm.prefs.feed}
            onToggle={(v) => vm.updatePref('feed', v)}
          />
          <View className="border-b border-gray-200 dark:border-[#38383A]" />
          <SettingsRow
            title={t('settings.notifications.nearbyUsers')}
            subtitle={t('settings.notifications.nearbyUsersDescription')}
            value={vm.prefs.nearby}
            onToggle={(v) => vm.updatePref('nearby', v)}
          />
        </View>

        {/* Quiet hours card */}
        <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          {t('settings.quietHours.title')}
        </Text>
        <View className="rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] px-4 mb-6">
          <SettingsRow
            title={t('settings.quietHours.enable')}
            subtitle={t('settings.quietHours.description')}
            value={vm.quietHours.enabled}
            onToggle={(v) => vm.updateQuietHours({ enabled: v })}
          />
          {vm.quietHours.enabled && (
            <>
              <View className="border-b border-gray-200 dark:border-[#38383A]" />
              <View className="flex-row items-center gap-3 py-3">
                <View>
                  <Text className="text-xs text-gray-400 dark:text-neutral-500 mb-1">
                    {t('settings.quietHours.from')}
                  </Text>
                  <Pressable
                    onPress={() => setShowTimePicker('start')}
                    className="rounded-xl bg-gray-200 dark:bg-[#48484A] px-4 py-2.5"
                  >
                    <Text className="text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
                      {vm.quietHours.start}
                    </Text>
                  </Pressable>
                </View>
                <View>
                  <Text className="text-xs text-gray-400 dark:text-neutral-500 mb-1">
                    {t('settings.quietHours.to')}
                  </Text>
                  <Pressable
                    onPress={() => setShowTimePicker('end')}
                    className="rounded-xl bg-gray-200 dark:bg-[#48484A] px-4 py-2.5"
                  >
                    <Text className="text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
                      {vm.quietHours.end}
                    </Text>
                  </Pressable>
                </View>
              </View>
              {showTimePicker && (
                <View className="py-2">
                  <DateTimePicker
                    value={parseTime(
                      showTimePicker === 'start' ? vm.quietHours.start : vm.quietHours.end,
                    )}
                    mode="time"
                    is24Hour
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                  />
                  {Platform.OS === 'ios' && (
                    <Pressable
                      onPress={() => setShowTimePicker(null)}
                      className="items-center py-2"
                    >
                      <Text className="text-sm font-medium text-primary">
                        {t('settings.quietHours.confirm')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}
