import type { ContentReportReason } from '@dogwalk/types';
import { CONTENT_REPORT_REASON } from '@dogwalk/types';
import { logger } from '@dogwalk/utils';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFeed } from '@/hooks/useFeed';

interface ReportReason {
  key: ContentReportReason;
  label: string;
}

const REASONS: ReportReason[] = [
  { key: CONTENT_REPORT_REASON.INAPPROPRIATE, label: 'Contenuto inappropriato' },
  { key: CONTENT_REPORT_REASON.HARASSMENT, label: 'Comportamento molesto' },
  { key: CONTENT_REPORT_REASON.SPAM, label: 'Spam' },
  { key: CONTENT_REPORT_REASON.VIOLENCE, label: 'Violenza' },
  { key: CONTENT_REPORT_REASON.OTHER, label: 'Altro' },
];

export function useReportViewModel() {
  const router = useRouter();
  const { contentType, contentId } = useLocalSearchParams<{
    contentType: 'post' | 'comment' | 'story';
    contentId: string;
  }>();
  const { reportContent } = useFeed();

  const [selectedReason, setSelectedReason] = useState<ContentReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason || !contentType || !contentId) return;

    setSubmitting(true);
    try {
      const success = await reportContent(contentType, contentId, selectedReason);
      if (success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Grazie', 'La tua segnalazione è stata inviata.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Errore', 'Impossibile inviare la segnalazione. Riprova.');
      }
    } catch (e) {
      logger.warn('ReportModal', 'Failed to submit report', e);
      Alert.alert('Errore', 'Impossibile inviare la segnalazione. Riprova.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedReason, contentType, contentId, reportContent, router]);

  const canSubmit = Boolean(selectedReason) && !submitting;

  return {
    reasons: REASONS,
    selectedReason,
    setSelectedReason,
    description,
    setDescription,
    submitting,
    canSubmit,
    handleSubmit,
  };
}
