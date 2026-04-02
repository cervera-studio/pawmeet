import { logger } from '@pawmeet/utils';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { getDateLocale } from '@/lib/i18n';
import { container } from '@/repositories/container';
import type { DogRating } from '@/repositories/interfaces';
import { FEEDBACK_REPOSITORY } from '@/repositories/tokens';

const feedbackRepo = container.resolve(FEEDBACK_REPOSITORY);

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date | string;
  fromUser: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((star) => (
        <Text key={star} className="text-sm">
          {star <= rating ? '\u{2B50}' : '\u{2606}'}
        </Text>
      ))}
    </View>
  );
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString(getDateLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const ReviewRow = memo(function ReviewRow({ review }: { review: ReviewItem }) {
  return (
    <View className="mb-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] p-4">
      <View className="flex-row items-center gap-3 mb-2">
        <Avatar name={review.fromUser.displayName} imageUrl={review.fromUser.avatarUrl} size="sm" />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F7]">
            {review.fromUser.displayName}
          </Text>
          <Text className="text-xs text-gray-400 dark:text-neutral-500">
            {formatDate(review.createdAt)}
          </Text>
        </View>
        <StarRating rating={review.rating} />
      </View>
      {review.comment ? (
        <Text className="text-sm text-gray-700 dark:text-[#D1D1D6]">{review.comment}</Text>
      ) : null}
    </View>
  );
});

interface DogReviewsProps {
  dogId: string;
  dogRating: DogRating | null;
}

export const DogReviews = memo(function DogReviews({ dogId, dogRating }: DogReviewsProps) {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dogId) return;

    feedbackRepo
      .getDogRating(dogId)
      .then((ratingData) => {
        if (ratingData && 'reviews' in ratingData) {
          setReviews((ratingData as DogRating & { reviews: ReviewItem[] }).reviews);
        }
        setLoading(false);
      })
      .catch((e) => {
        logger.warn('DogReviews', 'Failed to fetch reviews', e);
        setLoading(false);
      });
  }, [dogId]);

  if (loading) {
    return (
      <View className="mt-4">
        <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
          {t('feed.reviews.title')}
        </Text>
        <View className="items-center py-4">
          <ActivityIndicator size="small" color="#065F46" />
        </View>
      </View>
    );
  }

  return (
    <View className="mt-4">
      <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
        {t('feed.reviews.title')}
      </Text>

      {/* Aggregate rating summary */}
      {dogRating && dogRating.count > 0 ? (
        <View className="mb-3 flex-row items-center gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 p-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
            {dogRating.average?.toFixed(1) ?? '-'}
          </Text>
          <View>
            <StarRating rating={Math.round(dogRating.average ?? 0)} />
            <Text className="text-xs text-gray-500 dark:text-neutral-500">
              {dogRating.count}{' '}
              {dogRating.count === 1
                ? t('profile.dogDetail.reviewSingular')
                : t('profile.dogDetail.reviewPlural')}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Individual reviews */}
      {reviews.length > 0 ? (
        reviews.map((review) => <ReviewRow key={review.id} review={review} />)
      ) : (
        <View className="items-center rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] py-6 px-4">
          <Text className="text-sm text-gray-500 dark:text-neutral-500">
            {t('feed.reviews.noReviews')}
          </Text>
          <Text className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
            {t('feed.reviews.noReviewsDescription')}
          </Text>
        </View>
      )}
    </View>
  );
});
