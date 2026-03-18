import { MOOD_NOTES_MAX_LENGTH } from '@pawmeet/config';
import type { MoodTag } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import i18n from '@/lib/i18n';
import { container } from '@/repositories/container';
import { MOOD_LOG_REPOSITORY } from '@/repositories/tokens';

const repo = container.resolve(MOOD_LOG_REPOSITORY);

export function useMoodLogModalViewModel(
  dogId: string,
  trackId: string,
  onClose: () => void,
  onSubmit: () => void,
) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<MoodTag[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = useCallback((tag: MoodTag) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 5) return prev;
      return [...prev, tag];
    });
  }, []);

  const resetForm = useCallback(() => {
    setRating(0);
    setTags([]);
    setNotes('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      Alert.alert(i18n.t('common.error'), i18n.t('moodLog.ratingRequired'));
      return;
    }

    setSubmitting(true);
    try {
      await repo.submit({
        dogId,
        trackId,
        rating,
        tags,
        notes: notes || undefined,
      });
      resetForm();
      onSubmit();
    } catch (e) {
      logger.warn('MoodLogModal', 'Failed to submit mood log', e);
      Alert.alert(i18n.t('common.error'), i18n.t('moodLog.submitError'));
    } finally {
      setSubmitting(false);
    }
  }, [rating, tags, notes, dogId, trackId, resetForm, onSubmit]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  return {
    rating,
    setRating,
    tags,
    toggleTag,
    notes,
    setNotes,
    submitting,
    handleSubmit,
    handleClose,
    maxNotesLength: MOOD_NOTES_MAX_LENGTH,
  };
}
