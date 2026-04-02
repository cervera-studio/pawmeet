import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFeedback } from '@/hooks/useFeedback';
import i18n from '@/lib/i18n';

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
      Alert.alert(i18n.t('common.error'), i18n.t('walks.feedback.ratingRequired'));
      return;
    }

    try {
      await submitFeedback(walkId, toDogId, rating as 1 | 2 | 3 | 4 | 5, comment || undefined);
      resetForm();
      onSubmit();
    } catch (e) {
      logger.warn('FeedbackModal', 'Failed to submit feedback', e);
      Alert.alert(i18n.t('common.error'), i18n.t('walks.feedback.submitError'));
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
