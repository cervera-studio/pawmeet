import { MOOD_TAGS } from '@pawmeet/config';
import type { MoodTag } from '@pawmeet/types';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMoodLogModalViewModel } from './MoodLogModal.view-model';

type Props = {
  visible: boolean;
  dogId: string;
  trackId: string;
  onClose: () => void;
  onSubmit: () => void;
};

function StarSelector({ rating, onSelect }: { rating: number; onSelect: (v: number) => void }) {
  return (
    <View className="flex-row justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => onSelect(star)} className="p-1">
          <Text className="text-3xl">{star <= rating ? '\u{2B50}' : '\u{26AA}'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const ALL_TAGS: readonly MoodTag[] = MOOD_TAGS;

function TagSelector({
  selected,
  onToggle,
}: {
  selected: MoodTag[];
  onToggle: (tag: MoodTag) => void;
}) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
      <View className="flex-row flex-wrap gap-2 px-1">
        {ALL_TAGS.map((tag) => {
          const isSelected = selected.includes(tag);
          return (
            <Pressable
              key={tag}
              onPress={() => onToggle(tag)}
              className={`rounded-full px-3 py-1.5 border ${
                isSelected
                  ? 'bg-primary border-primary'
                  : 'bg-gray-50 dark:bg-[#2C2C2E] border-gray-200 dark:border-[#38383A]'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  isSelected ? 'text-white' : 'text-gray-700 dark:text-[#D1D1D6]'
                }`}
              >
                {t(`moodLog.tags.${tag}` as never)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function MoodLogModal({ visible, dogId, trackId, onClose, onSubmit }: Props) {
  const vm = useMoodLogModalViewModel(dogId, trackId, onClose, onSubmit);
  const { t } = useTranslation();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white dark:bg-[#1C1C1E]">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-100 dark:border-[#38383A] px-4 py-4">
          <Pressable onPress={vm.handleClose}>
            <Text className="text-base text-gray-500 dark:text-neutral-500">
              {t('common.cancel')}
            </Text>
          </Pressable>
          <Text className="text-lg font-bold text-gray-900 dark:text-[#F5F5F7]">
            {t('moodLog.title')}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView className="flex-1 px-4 py-6">
          {/* Rating */}
          <View className="mb-6">
            <Text className="mb-3 text-center text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('moodLog.ratingLabel')}
            </Text>
            <StarSelector rating={vm.rating} onSelect={vm.setRating} />
            {vm.rating > 0 && (
              <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500">
                {t(`moodLog.ratingValues.${vm.rating}` as never)}
              </Text>
            )}
          </View>

          {/* Tags */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('moodLog.tagsLabel')}
            </Text>
            <TagSelector selected={vm.tags} onToggle={vm.toggleTag} />
          </View>

          {/* Notes */}
          <View className="mb-6">
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('moodLog.notesLabel')}
            </Text>
            <TextInput
              value={vm.notes}
              onChangeText={vm.setNotes}
              placeholder={t('moodLog.notesPlaceholder')}
              className="rounded-xl border border-gray-200 dark:border-[#38383A] px-4 py-3 text-base text-gray-900 dark:text-[#F5F5F7]"
              placeholderTextColor="#9CA3AF"
              maxLength={vm.maxNotesLength}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text className="mt-1 text-right text-xs text-gray-400 dark:text-neutral-500">
              {vm.notes.length}/{vm.maxNotesLength}
            </Text>
          </View>

          {/* Submit */}
          <Pressable
            onPress={vm.handleSubmit}
            disabled={vm.submitting || vm.rating === 0}
            className={`items-center rounded-xl py-4 ${
              vm.submitting || vm.rating === 0 ? 'bg-gray-300 dark:bg-[#48484A]' : 'bg-primary'
            }`}
          >
            <Text className="text-base font-bold text-white">
              {vm.submitting ? t('moodLog.submitting') : t('moodLog.submit')}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
