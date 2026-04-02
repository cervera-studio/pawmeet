import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useProposeWalkViewModel } from './ProposeWalkModal.view-model';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

type Props = {
  visible: boolean;
  matchId: string;
  onClose: () => void;
  onPropose: (input: {
    matchId: string;
    scheduledAt: string;
    durationMin: number;
    title?: string;
    location?: string;
    notes?: string;
  }) => Promise<void>;
};

export function ProposeWalkModal({ visible, matchId, onClose, onPropose }: Props) {
  const { t } = useTranslation();
  const vm = useProposeWalkViewModel(matchId, onPropose, onClose);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white dark:bg-[#1C1C1E]">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-100 dark:border-[#38383A] px-4 py-4">
          <Pressable onPress={onClose}>
            <Text className="text-base text-gray-500 dark:text-neutral-500">
              {t('common.cancel')}
            </Text>
          </Pressable>
          <Text className="text-lg font-bold text-gray-900 dark:text-[#F5F5F7]">
            {t('walks.propose.title')}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
          {/* Date input */}
          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('walks.propose.dateLabel')}
            </Text>
            <TextInput
              value={vm.date}
              onChangeText={vm.setDate}
              placeholder="2026-03-15"
              className="rounded-xl border border-gray-200 dark:border-[#38383A] px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* Time input */}
          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('walks.propose.timeLabel')}
            </Text>
            <TextInput
              value={vm.time}
              onChangeText={vm.setTime}
              placeholder="10:00"
              className="rounded-xl border border-gray-200 dark:border-[#38383A] px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* Duration selector */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('walks.propose.durationLabel')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {DURATION_OPTIONS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => vm.setDurationMin(d)}
                  className={`rounded-xl px-4 py-2 ${
                    vm.durationMin === d ? 'bg-primary' : 'bg-gray-100 dark:bg-[#38383A]'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      vm.durationMin === d ? 'text-white' : 'text-gray-700 dark:text-[#D1D1D6]'
                    }`}
                  >
                    {d} min
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Title */}
          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('walks.propose.titleLabel')}
            </Text>
            <TextInput
              value={vm.title}
              onChangeText={vm.setTitle}
              placeholder={t('walks.propose.titlePlaceholder')}
              className="rounded-xl border border-gray-200 dark:border-[#38383A] px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />
          </View>

          {/* Location */}
          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('walks.propose.locationLabel')}
            </Text>
            <TextInput
              value={vm.location}
              onChangeText={vm.setLocation}
              placeholder={t('walks.propose.locationPlaceholder')}
              className="rounded-xl border border-gray-200 dark:border-[#38383A] px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              maxLength={200}
            />
          </View>

          {/* Notes */}
          <View className="mb-6">
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('walks.propose.notesLabel')}
            </Text>
            <TextInput
              value={vm.notes}
              onChangeText={vm.setNotes}
              placeholder={t('walks.propose.notesPlaceholder')}
              className="rounded-xl border border-gray-200 dark:border-[#38383A] px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              maxLength={500}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit button */}
          <Pressable
            onPress={vm.handleSubmit}
            disabled={vm.submitting}
            className={`items-center rounded-xl py-4 ${vm.submitting ? 'bg-gray-300 dark:bg-[#48484A]' : 'bg-primary'}`}
          >
            <Text className="text-base font-bold text-white">
              {vm.submitting ? t('common.sending') : t('walks.propose.submitButton')}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
