import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useFeedbackModalViewModel } from './FeedbackModal.view-model';

const MAX_COMMENT_LENGTH = 500;

type Props = {
  visible: boolean;
  walkId: string;
  toDogId: string;
  onClose: () => void;
  onSubmit: () => void;
};

function StarSelector({ rating, onSelect }: { rating: number; onSelect: (value: number) => void }) {
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

export function FeedbackModal({ visible, walkId, toDogId, onClose, onSubmit }: Props) {
  const vm = useFeedbackModalViewModel(walkId, toDogId, onClose, onSubmit);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white dark:bg-[#1C1C1E]">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-100 dark:border-[#38383A] px-4 py-4">
          <Pressable onPress={vm.handleClose}>
            <Text className="text-base text-gray-500 dark:text-neutral-500">Annulla</Text>
          </Pressable>
          <Text className="text-lg font-bold text-gray-900 dark:text-[#F5F5F7]">
            Feedback passeggiata
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <View className="flex-1 px-4 py-6">
          {/* Rating */}
          <View className="mb-6">
            <Text className="mb-3 text-center text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
              Come è andata la passeggiata?
            </Text>
            <StarSelector rating={vm.rating} onSelect={vm.setRating} />
            {vm.rating > 0 && (
              <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500">
                {vm.rating === 1 && 'Pessima'}
                {vm.rating === 2 && 'Scarsa'}
                {vm.rating === 3 && 'Nella media'}
                {vm.rating === 4 && 'Buona'}
                {vm.rating === 5 && 'Ottima'}
              </Text>
            )}
          </View>

          {/* Comment */}
          <View className="mb-6">
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              Commento (opzionale)
            </Text>
            <TextInput
              value={vm.comment}
              onChangeText={vm.setComment}
              placeholder="Racconta com'è andata..."
              className="rounded-xl border border-gray-200 dark:border-[#38383A] px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              maxLength={MAX_COMMENT_LENGTH}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text className="mt-1 text-right text-xs text-gray-400 dark:text-neutral-500">
              {vm.comment.length}/{MAX_COMMENT_LENGTH}
            </Text>
          </View>

          {/* Submit button */}
          <Pressable
            onPress={vm.handleSubmit}
            disabled={vm.submitting || vm.rating === 0}
            className={`items-center rounded-xl py-4 ${
              vm.submitting || vm.rating === 0 ? 'bg-gray-300 dark:bg-[#48484A]' : 'bg-primary'
            }`}
          >
            <Text className="text-base font-bold text-white">
              {vm.submitting ? 'Invio...' : 'Invia feedback'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
