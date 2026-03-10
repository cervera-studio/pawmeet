import { logger } from '@dogwalk/utils';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFeedback } from '@/hooks/useFeedback';

export function useFeedbackModalViewModel(
  walkId: string,
  toDogId: string,
  onClose: () => void,
  onSubmit: () => void,
) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const { submitting, submitFeedback } = useFeedback();

  const resetForm = useCallback(() => {
    setRating(0);
    setComment('');
  }, []);

  const handleSubmit = useCallback(async () => {
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
  }, [rating, comment, walkId, toDogId, submitFeedback, resetForm, onSubmit]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  return {
    rating,
    setRating,
    comment,
    setComment,
    submitting,
    handleSubmit,
    handleClose,
  };
}
