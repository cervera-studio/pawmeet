import type { ScoreBreakdown } from '@pawmeet/types';
import { getExplanationItems } from '@pawmeet/utils';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

interface ExplanationModalProps {
  visible: boolean;
  onClose: () => void;
  overallScore: number;
  breakdown: ScoreBreakdown | null;
  loading?: boolean;
}

function BarColor({ score }: { score: number }) {
  if (score >= 0.6) return 'bg-green-500';
  if (score >= 0.4) return 'bg-yellow-500';
  return 'bg-red-500';
}

function DimensionRow({ name, score, label }: { name: string; score: number; label: string }) {
  const widthPercent = Math.max(score * 100, 4); // minimum 4% so bar is visible
  const barColor = BarColor({ score });

  return (
    <View className="mb-4">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">{name}</Text>
        <Text className="text-xs text-gray-500 dark:text-neutral-500">{label}</Text>
      </View>
      <View className="h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-[#48484A]">
        <View className={`h-full rounded-full ${barColor}`} style={{ width: `${widthPercent}%` }} />
      </View>
    </View>
  );
}

export function ExplanationModal({
  visible,
  onClose,
  overallScore,
  breakdown,
  loading,
}: ExplanationModalProps) {
  const { t } = useTranslation();
  const items = breakdown ? getExplanationItems(breakdown) : [];
  const overallPercent = Math.round(overallScore * 100);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-white dark:bg-[#1C1C1E] px-5 pb-8 pt-4">
          {/* Handle bar */}
          <View className="mb-4 items-center">
            <View className="h-1 w-10 rounded-full bg-gray-300 dark:bg-[#48484A]" />
          </View>

          {/* Header */}
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900 dark:text-[#F5F5F7]">
              {t('match.compatibility')}
            </Text>
            <View className="rounded-full bg-primary/10 px-4 py-1.5">
              <Text className="text-lg font-bold text-primary">{overallPercent}%</Text>
            </View>
          </View>

          {/* Content */}
          {loading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#065F46" />
            </View>
          ) : (
            <View>
              {items.map((item) => (
                <DimensionRow
                  key={item.key}
                  name={t(item.nameKey)}
                  score={item.score}
                  label={t(item.labelKey)}
                />
              ))}
            </View>
          )}

          {/* Close button */}
          <Pressable
            onPress={onClose}
            className="mt-4 rounded-2xl bg-gray-100 dark:bg-[#38383A] py-3"
          >
            <Text className="text-center text-base font-semibold text-gray-700 dark:text-[#D1D1D6]">
              {t('match.close')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
