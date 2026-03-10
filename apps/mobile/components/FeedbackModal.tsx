import { logger } from '@dogwalk/utils';
import { useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useFeedback } from '@/hooks/useFeedback';

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
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const { submitting, submitFeedback } = useFeedback();

  const resetForm = () => {
    setRating(0);
    setComment('');
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Errore', 'Seleziona una valutazione');
      return;
    }

    try {
      await submitFeedback(walkId, toDogId, rating, comment || undefined);
      resetForm();
      onSubmit();
    } catch (e) {
      logger.warn('FeedbackModal', 'Failed to submit feedback', e);
      Alert.alert('Errore', 'Impossibile inviare il feedback. Riprova.');
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-4">
          <Pressable onPress={handleClose}>
            <Text className="text-base text-gray-500">Annulla</Text>
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Feedback passeggiata</Text>
          <View style={{ width: 60 }} />
        </View>

        <View className="flex-1 px-4 py-6">
          {/* Rating */}
          <View className="mb-6">
            <Text className="mb-3 text-center text-base font-medium text-gray-700">
              Come è andata la passeggiata?
            </Text>
            <StarSelector rating={rating} onSelect={setRating} />
            {rating > 0 && (
              <Text className="mt-2 text-center text-sm text-gray-500">
                {rating === 1 && 'Pessima'}
                {rating === 2 && 'Scarsa'}
                {rating === 3 && 'Nella media'}
                {rating === 4 && 'Buona'}
                {rating === 5 && 'Ottima'}
              </Text>
            )}
          </View>

          {/* Comment */}
          <View className="mb-6">
            <Text className="mb-1 text-sm font-medium text-gray-700">Commento (opzionale)</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Racconta com'è andata..."
              className="rounded-xl border border-gray-200 px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              maxLength={MAX_COMMENT_LENGTH}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text className="mt-1 text-right text-xs text-gray-400">
              {comment.length}/{MAX_COMMENT_LENGTH}
            </Text>
          </View>

          {/* Submit button */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting || rating === 0}
            className={`items-center rounded-xl py-4 ${
              submitting || rating === 0 ? 'bg-gray-300' : 'bg-primary'
            }`}
          >
            <Text className="text-base font-bold text-white">
              {submitting ? 'Invio...' : 'Invia feedback'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
