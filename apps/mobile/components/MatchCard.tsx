import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';

interface MatchCardProps {
  dogName: string;
  ownerName: string;
  breed: string;
  matchedAt: string;
  compatibilityScore?: number;
  status?: 'nuovo' | 'in_chat' | 'incontrato';
  /** Name of the user's own dog for this match (shown when user has multiple dogs) */
  myDogName?: string;
  /** Top compatibility reason label */
  topReason?: string;
  /** Callback when compatibility score is tapped */
  onCompatibilityTap?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  nuovo: 'bg-primary-100 text-primary',
  in_chat: 'bg-blue-100 text-blue-600',
  incontrato: 'bg-green-100 text-green-600',
};

const STATUS_KEYS: Record<string, string> = {
  nuovo: 'matches.status.nuovo',
  in_chat: 'matches.status.inChat',
  incontrato: 'matches.status.incontrato',
};

export const MatchCard = memo(function MatchCard({
  dogName,
  ownerName,
  breed,
  matchedAt,
  compatibilityScore,
  status,
  myDogName,
  topReason,
  onCompatibilityTap,
}: MatchCardProps) {
  const { t } = useTranslation();
  const statusColor = status ? STATUS_COLORS[status] : null;
  const statusKey = status ? STATUS_KEYS[status] : null;

  return (
    <View className="mb-3 flex-row items-center rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm">
      <Avatar name={dogName} size="md" />
      <View className="ml-3 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
            {dogName} & {ownerName}
          </Text>
          {statusColor && statusKey && (
            <View className={`rounded-full px-2 py-0.5 ${statusColor.split(' ')[0]}`}>
              <Text className={`text-[10px] font-medium ${statusColor.split(' ')[1]}`}>
                {t(statusKey)}
              </Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-gray-500 dark:text-neutral-500">{breed}</Text>
        {compatibilityScore != null && (
          <Pressable onPress={onCompatibilityTap}>
            <Text className="text-xs text-primary">
              {t('matches.compatiblePercent', { score: Math.round(compatibilityScore * 100) })}
            </Text>
            {topReason && <Text className="text-xs text-primary/70">{topReason}</Text>}
          </Pressable>
        )}
        {myDogName && (
          <View className="mt-1 flex-row items-center">
            <Text className="text-[10px] text-gray-400 dark:text-neutral-500">via {myDogName}</Text>
          </View>
        )}
      </View>
      <Text className="text-xs text-gray-400 dark:text-neutral-500">{matchedAt}</Text>
    </View>
  );
});

MatchCard.displayName = 'MatchCard';
