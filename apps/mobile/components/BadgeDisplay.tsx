import type { RouterOutput } from '@pawmeet/api-client';
import { BADGE_TYPE } from '@pawmeet/types';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

type Badge = RouterOutput['badges']['listByDog']['badges'][number];

const BADGE_ICONS: Record<string, string> = {
  [BADGE_TYPE.FIRST_MEETING]: '\u{1F91D}',
  [BADGE_TYPE.REGULAR_WALKER]: '\u{1F6B6}',
  [BADGE_TYPE.SUPER_SOCIAL]: '\u{2B50}',
  [BADGE_TYPE.FRIENDLY_DOG]: '\u{1F415}',
};

type Props = {
  badges: Badge[];
};

export const BadgeDisplay = memo(function BadgeDisplay({ badges }: Props) {
  const { t } = useTranslation();

  const badgeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      [BADGE_TYPE.FIRST_MEETING]: t('badges.firstMeeting'),
      [BADGE_TYPE.REGULAR_WALKER]: t('badges.regularWalker'),
      [BADGE_TYPE.SUPER_SOCIAL]: t('badges.superSocial'),
      [BADGE_TYPE.FRIENDLY_DOG]: t('badges.friendlyDog'),
    };
    return labels[type] ?? type;
  };

  if (badges.length === 0) {
    return (
      <View className="items-center rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] py-4">
        <Text className="text-sm text-gray-400 dark:text-neutral-500">{t('badges.noBadges')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {badges.map((badge) => (
        <View key={badge.id} className="items-center rounded-xl bg-primary-50 px-3 py-2">
          <Text className="text-2xl">{BADGE_ICONS[badge.type] ?? '\u{1F3C5}'}</Text>
          <Text className="mt-1 text-xs font-medium text-gray-700 dark:text-[#D1D1D6]">
            {badgeLabel(badge.type)}
          </Text>
        </View>
      ))}
    </View>
  );
});

BadgeDisplay.displayName = 'BadgeDisplay';
