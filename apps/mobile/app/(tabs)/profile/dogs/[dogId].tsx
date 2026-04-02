import type { RouterOutput } from '@pawmeet/api-client';
import { PHOTO_MODERATION_STATUS } from '@pawmeet/types';
import { formatDogAge } from '@pawmeet/utils';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { DogReviews } from '@/components/DogReviews';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { label, MAX_PHOTOS, useDogDetailViewModel } from './_vm/[dogId].view-model';

type Dog = RouterOutput['dogs']['get']['dog'];
type DogPhoto = RouterOutput['dogs']['get']['photos'][number];

function InfoChip({ title, value }: { title: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-xl bg-primary-50 p-3">
      <Text className="text-xs text-gray-500 dark:text-neutral-500">{title}</Text>
      <Text className="text-center text-sm font-semibold text-gray-900 dark:text-[#F5F5F7]">
        {value}
      </Text>
    </View>
  );
}

function DogHeader({ dog, primaryPhotoUrl }: { dog: Dog; primaryPhotoUrl: string | undefined }) {
  const { t } = useTranslation();
  return (
    <View className="items-center">
      <Avatar name={dog.name} imageUrl={primaryPhotoUrl} size="lg" />
      <Text className="mt-3 text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">{dog.name}</Text>
      <Text className="text-base text-gray-500 dark:text-neutral-500">{dog.breed}</Text>
      {dog.breedSecondary ? (
        <Text className="text-sm text-gray-400 dark:text-neutral-500">
          {t('profile.dogDetail.crossbreed', { breed: dog.breedSecondary })}
        </Text>
      ) : null}
      <Text className="text-sm text-gray-400 dark:text-neutral-500">
        {formatDogAge(new Date(dog.birthDate))} - {label(dog.gender)} -{' '}
        {dog.isNeutered ? t('profile.dogDetail.neutered') : t('profile.dogDetail.notNeutered')}
      </Text>
      {!dog.isActive && (
        <View className="mt-2 rounded-full bg-gray-200 dark:bg-[#48484A] px-3 py-1">
          <Text className="text-xs font-medium text-gray-600 dark:text-[#D1D1D6]">
            {t('profile.dogDetail.deactivated')}
          </Text>
        </View>
      )}
    </View>
  );
}

function DogInfoChips({ dog }: { dog: Dog }) {
  const { t } = useTranslation();
  return (
    <View className="mt-4 flex-row gap-3">
      <InfoChip title={t('profile.dogDetail.infoSize')} value={label(dog.size)} />
      <InfoChip title={t('profile.dogDetail.infoWeight')} value={`${dog.weightKg} kg`} />
      <InfoChip title={t('profile.dogDetail.infoEnergy')} value={label(dog.energyLevel)} />
    </View>
  );
}

function DogTraits({ dog }: { dog: Dog }) {
  const { t } = useTranslation();
  return (
    <>
      {/* Temperament */}
      <View className="mt-4 gap-3">
        <Text className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
          {t('profile.dogDetail.temperament')}
        </Text>
        <View className="flex-row gap-3">
          <InfoChip title={t('profile.dogDetail.withDogs')} value={label(dog.behaviorWithDogs)} />
          <InfoChip
            title={t('profile.dogDetail.withPeople')}
            value={label(dog.behaviorWithPeople)}
          />
        </View>
        <View className="flex-row gap-3">
          <InfoChip title={t('profile.dogDetail.leash')} value={label(dog.leashBehavior)} />
          {dog.recallReliability ? (
            <InfoChip title={t('profile.dogDetail.recall')} value={label(dog.recallReliability)} />
          ) : (
            <View className="flex-1" />
          )}
        </View>
      </View>

      {/* Walk preferences */}
      <View className="mt-4 gap-3">
        <Text className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
          {t('profile.dogDetail.walkPrefs')}
        </Text>
        <View className="rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] p-4">
          <Text className="mb-1 text-sm font-medium text-gray-500 dark:text-neutral-500">
            {t('profile.dogDetail.walkSchedule')}
          </Text>
          <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
            {dog.walkPrefTime.map(label).join(', ')}
          </Text>
        </View>
        <View className="rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] p-4">
          <Text className="mb-1 text-sm font-medium text-gray-500 dark:text-neutral-500">
            {t('profile.dogDetail.walkTerrain')}
          </Text>
          <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
            {dog.walkPrefTerrain.map(label).join(', ')}
          </Text>
        </View>
        <View className="rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] p-4">
          <Text className="mb-1 text-sm font-medium text-gray-500 dark:text-neutral-500">
            {t('profile.dogDetail.walkDuration')}
          </Text>
          <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
            {t('profile.dogDetail.durationFormat', {
              min: dog.walkPrefDurationMin,
              max: dog.walkPrefDurationMax,
            })}
          </Text>
        </View>
      </View>
    </>
  );
}

function PhotoGallery({
  photos,
  deletingPhotoId,
  uploading,
  onUploadPhoto,
  onDeletePhoto,
}: {
  photos: DogPhoto[];
  deletingPhotoId: string | null;
  uploading: boolean;
  onUploadPhoto: () => void;
  onDeletePhoto: (photoId: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="mt-4">
      <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
        {t('profile.dogDetail.photosCount', { current: photos.length, max: MAX_PHOTOS })}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {photos.map((photo) => (
          <Pressable
            key={photo.id}
            onLongPress={() => onDeletePhoto(photo.id)}
            className="relative h-24 w-24 overflow-hidden rounded-xl"
          >
            <Image source={{ uri: photo.url }} className="h-full w-full" resizeMode="cover" />
            {deletingPhotoId === photo.id && (
              <View className="absolute inset-0 items-center justify-center bg-black/40">
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            )}
            {photo.moderationStatus === PHOTO_MODERATION_STATUS.PENDING && (
              <View className="absolute bottom-1 left-1 rounded-full bg-yellow-500 px-1.5 py-0.5">
                <Text className="text-[10px] font-medium text-white">
                  {t('profile.dogDetail.photoReview')}
                </Text>
              </View>
            )}
            {photo.moderationStatus === PHOTO_MODERATION_STATUS.REJECTED && (
              <View className="absolute bottom-1 left-1 rounded-full bg-red-500 px-1.5 py-0.5">
                <Text className="text-[10px] font-medium text-white">
                  {t('profile.dogDetail.photoRejected')}
                </Text>
              </View>
            )}
          </Pressable>
        ))}

        {/* Upload button — shown only when under the limit */}
        {photos.length < MAX_PHOTOS && (
          <Pressable
            onPress={onUploadPhoto}
            disabled={uploading}
            className="h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-[#48484A]"
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#065F46" />
            ) : (
              <Text className="text-2xl text-gray-400 dark:text-neutral-500">+</Text>
            )}
          </Pressable>
        )}
      </View>
      {photos.length > 0 && (
        <Text className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
          {t('profile.dogDetail.photoLongPress')}
        </Text>
      )}
    </View>
  );
}

function DogActions({
  isActive,
  deleting,
  onToggleActive,
  onDelete,
}: {
  isActive: boolean;
  deleting: boolean;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="mt-8 gap-3 pb-4">
      <Button
        onPress={onToggleActive}
        label={
          isActive
            ? t('profile.dogDetail.deactivateProfile')
            : t('profile.dogDetail.activateProfile')
        }
        variant="outline"
      />
      <Pressable onPress={onDelete} disabled={deleting} className="items-center py-3">
        <Text className="text-base font-medium text-red-500">
          {deleting ? t('common.deleting') : t('profile.dogDetail.deleteProfile')}
        </Text>
      </Pressable>
    </View>
  );
}

export default function DogDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const vm = useDogDetailViewModel();

  if (vm.loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: t('profile.dogDetail.loading'),
            headerBackTitle: t('profile.dogDetail.backButton'),
          }}
        />
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#065F46" />
        </View>
      </>
    );
  }

  if (!vm.dog) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: t('profile.dogDetail.error'),
            headerBackTitle: t('profile.dogDetail.backButton'),
          }}
        />
        <View className="flex-1 items-center justify-center bg-white">
          <Text className="text-gray-500 dark:text-neutral-500">
            {t('profile.dogDetail.notFound')}
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: vm.dog.name,
          headerBackTitle: t('profile.dogDetail.backButton'),
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white dark:bg-[#1C1C1E]">
        <ScrollView contentContainerClassName="px-6 py-4">
          {/* Header */}
          <DogHeader dog={vm.dog} primaryPhotoUrl={vm.primaryPhoto?.url} />

          {/* Rating */}
          {vm.dogRating && vm.dogRating.count > 0 && (
            <View className="mt-3 flex-row items-center justify-center gap-1">
              <Text className="text-base">{'\u{2B50}'}</Text>
              <Text className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
                {vm.dogRating.average?.toFixed(1) ?? '-'}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-neutral-500">
                ({vm.dogRating.count}{' '}
                {vm.dogRating.count === 1
                  ? t('profile.dogDetail.reviewSingular')
                  : t('profile.dogDetail.reviewPlural')}
                )
              </Text>
            </View>
          )}

          {/* Badges */}
          <View className="mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
                {t('profile.dogDetail.badges')}
              </Text>
              <Pressable
                onPress={() =>
                  vm.dog && router.push(`/(tabs)/profile/dogs/badges?dogId=${vm.dog.id}`)
                }
              >
                <Text className="text-sm font-medium text-primary">
                  {t('profile.dogDetail.viewAllBadges')}
                </Text>
              </Pressable>
            </View>
            <BadgeDisplay badges={vm.badges} />
          </View>

          {/* Mood history link */}
          <Pressable
            onPress={() => vm.dog && router.push(`/(tabs)/profile/mood-history?dogId=${vm.dog.id}`)}
            className="mt-4 flex-row items-center rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] p-4"
          >
            <Text className="text-2xl mr-3">{'\u{1F4DD}'}</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
                {t('profile.dogDetail.moodHistory')}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-neutral-500">
                {t('profile.dogDetail.moodHistorySubtitle')}
              </Text>
            </View>
            <Text className="text-neutral-400 dark:text-neutral-500">{'\u203A'}</Text>
          </Pressable>

          {/* Bio */}
          {vm.dog.bio ? (
            <View className="mt-6 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] p-4">
              <Text className="mb-1 text-sm font-medium text-gray-500 dark:text-neutral-500">
                {t('profile.dogDetail.bio')}
              </Text>
              <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">{vm.dog.bio}</Text>
            </View>
          ) : null}

          {/* Stats */}
          <DogInfoChips dog={vm.dog} />

          {/* Traits & Walk preferences */}
          <DogTraits dog={vm.dog} />

          {/* Reviews */}
          <DogReviews dogId={vm.dog.id} dogRating={vm.dogRating} />

          {/* Edit button */}
          <Button
            onPress={vm.navigateToEdit}
            label={t('profile.dogDetail.editProfile')}
            variant="outline"
          />

          {/* Photo gallery */}
          <PhotoGallery
            photos={vm.photos}
            deletingPhotoId={vm.deletingPhotoId}
            uploading={vm.uploading}
            onUploadPhoto={vm.handleUploadPhoto}
            onDeletePhoto={vm.handleDeletePhoto}
          />

          {/* Actions */}
          <DogActions
            isActive={vm.dog.isActive}
            deleting={vm.deleting}
            onToggleActive={vm.handleToggleActive}
            onDelete={vm.handleDelete}
          />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
