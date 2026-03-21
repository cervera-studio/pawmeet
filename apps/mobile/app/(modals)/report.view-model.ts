import type { ContentReportReason } from '@pawmeet/types';
import { CONTENT_REPORT_REASON } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFeed } from '@/hooks/useFeed';
import { isValidUUID } from '@/lib/deep-link-validation';
import i18n from '@/lib/i18n';

interface ReportReason {
  key: ContentReportReason;
  label: string;
}

function getReasons(): ReportReason[] {
  return [
    { key: CONTENT_REPORT_REASON.INAPPROPRIATE, label: i18n.t('report.reasons.inappropriate') },
    { key: CONTENT_REPORT_REASON.HARASSMENT, label: i18n.t('report.reasons.harassment') },
    { key: CONTENT_REPORT_REASON.SPAM, label: i18n.t('report.reasons.spam') },
    { key: CONTENT_REPORT_REASON.VIOLENCE, label: i18n.t('report.reasons.violence') },
    { key: CONTENT_REPORT_REASON.OTHER, label: i18n.t('report.reasons.other') },
  ];
}

export function useReportViewModel() {
  const router = useRouter();
  const { contentType, contentId: rawContentId } = useLocalSearchParams<{
    contentType: 'post' | 'comment' | 'story';
    contentId: string;
  }>();
  const contentId = rawContentId && isValidUUID(rawContentId) ? rawContentId : undefined;
  const { reportContent } = useFeed();

  const [selectedReason, setSelectedReason] = useState<ContentReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!(selectedReason && contentType && contentId)) return;

    setSubmitting(true);
    try {
      const success = await reportContent(contentType, contentId, selectedReason);
      if (success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(i18n.t('report.successTitle'), i18n.t('report.successMessage'), [
          { text: i18n.t('common.ok'), onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(i18n.t('common.error'), i18n.t('report.error'));
      }
    } catch (e) {
      logger.warn('ReportModal', 'Failed to submit report', e);
      Alert.alert(i18n.t('common.error'), i18n.t('report.error'));
    } finally {
      setSubmitting(false);
    }
  }, [selectedReason, contentType, contentId, reportContent, router]);

  const canSubmit = Boolean(selectedReason) && !submitting;

  return {
    reasons: getReasons(),
    selectedReason,
    setSelectedReason,
    description,
    setDescription,
    submitting,
    canSubmit,
    handleSubmit,
  };
}
