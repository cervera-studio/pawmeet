import { logger } from '@pawmeet/utils';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { container } from '@/repositories/container';
import type { TrendingHashtag } from '@/repositories/interfaces';
import { FEED_REPOSITORY } from '@/repositories/tokens';

const feedRepo = container.resolve(FEED_REPOSITORY);

export const TrendingHashtags = memo(function TrendingHashtags() {
  const { t } = useTranslation();
  const router = useRouter();
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    feedRepo
      .trendingHashtags(10)
      .then((data) => {
        setHashtags(data.hashtags);
        setLoading(false);
      })
      .catch((e) => {
        logger.warn('TrendingHashtags', 'Failed to fetch trending hashtags', e);
        setLoading(false);
      });
  }, []);

  const navigateToHashtag = useCallback(
    (hashtag: string) => {
      router.push(`/(tabs)/discover/feed/hashtag?hashtag=${encodeURIComponent(hashtag)}`);
    },
    [router],
  );

  if (loading || hashtags.length === 0) return null;

  return (
    <View className="border-b border-gray-100 dark:border-[#38383A] py-3">
      <Text className="mb-2 px-4 text-sm font-semibold text-gray-900 dark:text-[#F5F5F7]">
        {t('feed.hashtag.trending')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-3">
        {hashtags.map((tag) => (
          <Pressable
            key={tag.name}
            onPress={() => navigateToHashtag(tag.name)}
            className="mx-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5"
          >
            <Text className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              #{tag.name}
            </Text>
            <Text className="text-xs text-emerald-600 dark:text-emerald-400">
              {t('feed.hashtag.postsCount', { count: tag.usageCount })}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
});
