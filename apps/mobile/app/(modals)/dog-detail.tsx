import type { RouterOutput } from '@pawmeet/api-client';
import { formatBreedName, formatDogAge } from '@pawmeet/utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { DogReviews } from '@/components/DogReviews';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/trpc';

type PublicProfile = RouterOutput['dogs']['getPublicProfile'];

// ── Loading Skeleton ──────────────────────────────────────────────────────

function DogDetailSkeleton() {
  return (
    <View className="flex-1 bg-white px-6 py-4 dark:bg-[#1C1C1E]">
      <View className="mb-4 h-72 items-center justify-center rounded-2xl bg-gray-100 dark:bg-[#38383A]">
        <ActivityIndicator size="large" />
      </View>
      <View className="mb-2 h-7 w-40 rounded-lg bg-gray-100 dark:bg-[#2C2C2E]" />
      <View className="mb-4 h-5 w-56 rounded-lg bg-gray-100 dark:bg-[#2C2C2E]" />
      <View className="h-24 rounded-2xl bg-gray-100 dark:bg-[#2C2C2E]" />
      <View className="mt-4 flex-row gap-3">
        <View className="h-16 flex-1 rounded-xl bg-gray-100 dark:bg-[#2C2C2E]" />
        <View className="h-16 flex-1 rounded-xl bg-gray-100 dark:bg-[#2C2C2E]" />
        <View className="h-16 flex-1 rounded-xl bg-gray-100 dark:bg-[#2C2C2E]" />
      </View>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatAgeFromMonths(ageMonths: number): string {
  // Build a fake birthDate that is `ageMonths` months ago so formatDogAge works
  const now = new Date();
  const birthDate = new Date(now.getFullYear(), now.getMonth() - ageMonths, now.getDate());
  return formatDogAge(birthDate);
}

// ── Component ─────────────────────────────────────────────────────────────

export default function DogDetailModal() {
  const router = useRouter();
  const { t } = useTranslation();
  const { dogId } = useLocalSearchParams<{ dogId: string }>();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const handlePhotoError = useCallback(() => setPhotoError(true), []);

  useEffect(() => {
    if (!dogId) {
      setError(t('profile.dogDetail.invalidId'));
      setLoading(false);
      return;
    }

    api.dogs.getPublicProfile
      .query({ id: dogId })
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => {
        setError(t('errors.generic'));
        setLoading(false);
      });
  }, [dogId, t]);

  if (loading) {
    return <DogDetailSkeleton />;
  }

  if (error || !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#1C1C1E]">
        <Text className="text-base text-gray-500 dark:text-neutral-500">
          {error ?? t('profile.dogDetail.notFound')}
        </Text>
      </View>
    );
  }

  const primaryPhoto = profile.photos.find((p) => p.isPrimary) ?? profile.photos[0];
  const ageLabel = formatAgeFromMonths(profile.ageMonths);

  const label = (value: string): string => {
    const key = `labels.${value}`;
    const translated = t(key);
    return translated === key ? value : translated;
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-[#1C1C1E]" contentContainerClassName="px-6 py-4">
      {/* Header photo */}
      {primaryPhoto && !photoError ? (
        <View className="mb-4 h-72 overflow-hidden rounded-2xl">
          <Image
            source={{ uri: primaryPhoto.url }}
            className="h-full w-full"
            resizeMode="cover"
            onError={handlePhotoError}
          />
        </View>
      ) : (
        <View className="mb-4 h-72 items-center justify-center rounded-2xl bg-gray-100 dark:bg-[#38383A]">
          <Avatar name={profile.name} size="lg" />
        </View>
      )}

      {/* Name, breed, age */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
            {profile.name}
          </Text>
          <Text className="text-base text-gray-500 dark:text-neutral-500">
            {formatBreedName(profile.breed)}
            {profile.breedSecondary ? ` / ${formatBreedName(profile.breedSecondary)}` : ''} -{' '}
            {ageLabel}
          </Text>
        </View>
      </View>

      {/* Bio */}
      {profile.bio ? (
        <View className="mt-4 rounded-2xl bg-gray-50 p-4 dark:bg-[#2C2C2E]">
          <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">{profile.bio}</Text>
        </View>
      ) : null}

      {/* Trait chips */}
      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 items-center rounded-xl bg-primary-50 p-3 dark:bg-[#2C2C2E]">
          <Text className="text-xs text-gray-500 dark:text-neutral-500">
            {t('profile.dogDetail.size')}
          </Text>
          <Text className="font-semibold text-gray-900 dark:text-[#F5F5F7]">
            {label(profile.size)}
          </Text>
        </View>
        <View className="flex-1 items-center rounded-xl bg-primary-50 p-3 dark:bg-[#2C2C2E]">
          <Text className="text-xs text-gray-500 dark:text-neutral-500">
            {t('profile.dogDetail.energy')}
          </Text>
          <Text className="font-semibold text-gray-900 dark:text-[#F5F5F7]">
            {label(profile.energyLevel)}
          </Text>
        </View>
        <View className="flex-1 items-center rounded-xl bg-primary-50 p-3 dark:bg-[#2C2C2E]">
          <Text className="text-xs text-gray-500 dark:text-neutral-500">
            {t('profile.dogDetail.character')}
          </Text>
          <Text className="font-semibold text-gray-900 dark:text-[#F5F5F7]">
            {label(profile.behaviorWithDogs)}
          </Text>
        </View>
      </View>

      {/* Reviews */}
      {dogId && <DogReviews dogId={dogId} dogRating={null} />}

      {/* Owner info */}
      <View className="mt-4 flex-row items-center rounded-2xl bg-gray-50 p-4 dark:bg-[#2C2C2E]">
        <Avatar name={profile.ownerFirstName} size="sm" />
        <View className="ml-3">
          <Text className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
            {profile.ownerFirstName}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-neutral-500">
            {t('profile.dogDetail.owner')}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View className="mt-6 gap-3 pb-8">
        <Button onPress={() => router.back()} label={t('profile.dogDetail.like')} />
        <Pressable onPress={() => router.push('/(modals)/report')} className="items-center py-2">
          <Text className="text-sm text-gray-400 dark:text-neutral-500">
            {t('profile.dogDetail.reportProfile')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
