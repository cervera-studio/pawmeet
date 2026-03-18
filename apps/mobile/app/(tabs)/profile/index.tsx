export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { MAX_DOGS_PER_USER } from '@pawmeet/config';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DogProfileCard } from '@/components/DogProfileCard';
import { Avatar } from '@/components/ui/Avatar';
import { formatDogAge, useProfileViewModel } from './index.view-model';

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ProfileLoadingSkeleton() {
  return (
    <View className="px-4 py-6">
      {/* Avatar skeleton */}
      <View className="mb-8 items-center">
        <View className="h-20 w-20 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse" />
        <View className="mt-3 h-5 w-32 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
        <View className="mt-2 h-4 w-40 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      </View>

      {/* Dogs section skeleton */}
      <View className="mb-6">
        <View className="mb-3 h-5 w-24 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
        <View className="flex-row items-center rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm">
          <View className="h-12 w-12 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse" />
          <View className="ml-3 flex-1">
            <View className="h-4 w-28 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
            <View className="mt-2 h-3 w-36 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
          </View>
        </View>
      </View>

      {/* Menu skeleton */}
      <View className="gap-1">
        <View className="h-12 rounded-xl bg-gray-100 dark:bg-[#38383A] animate-pulse" />
        <View className="h-12 rounded-xl bg-gray-100 dark:bg-[#38383A] animate-pulse" />
        <View className="h-12 rounded-xl bg-gray-100 dark:bg-[#38383A] animate-pulse" />
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { t } = useTranslation();
  const vm = useProfileViewModel();

  // Show skeleton while initial data is loading
  if (vm.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]">
        <ProfileLoadingSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]">
      <ScrollView contentContainerClassName="px-4 py-6">
        {/* User profile */}
        <View className="mb-8 items-center">
          <Pressable onPress={vm.handleAvatarPress} disabled={vm.uploading} className="relative">
            <Avatar
              name={vm.user?.displayName ?? t('profile.defaultName')}
              imageUrl={vm.user?.avatarUrl}
              size="lg"
            />
            {/* Camera icon overlay */}
            <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full bg-primary">
              {vm.uploading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-sm text-white">{'\u{1F4F7}'}</Text>
              )}
            </View>
          </Pressable>
          <Text className="mt-3 text-xl font-bold text-gray-900 dark:text-[#F5F5F7]">
            {vm.user?.displayName ?? t('profile.defaultName')}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-neutral-500">{vm.user?.email}</Text>
          <Text className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
            {t('profile.changePhoto')}
          </Text>

          {/* Follow counts */}
          <View className="mt-4 flex-row gap-6">
            <Pressable onPress={vm.navigateToFollowers} className="items-center">
              <Text className="text-lg font-bold text-gray-900 dark:text-[#F5F5F7]">
                {vm.followCounts.followers}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-neutral-500">
                {t('profile.follower')}
              </Text>
            </Pressable>
            <Pressable onPress={vm.navigateToFollowing} className="items-center">
              <Text className="text-lg font-bold text-gray-900 dark:text-[#F5F5F7]">
                {vm.followCounts.following}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-neutral-500">
                {t('profile.following')}
              </Text>
            </Pressable>
            <Pressable onPress={vm.navigateToFriends} className="items-center">
              <Text className="text-lg font-bold text-primary">{t('profile.friends')}</Text>
              <Text className="text-xs text-gray-500 dark:text-neutral-500">
                {t('profile.friendsSubtitle')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Search users */}
        <Pressable
          onPress={vm.navigateToSearchUsers}
          className="mb-6 flex-row items-center justify-center gap-2 rounded-xl bg-gray-50 dark:bg-[#2C2C2E] py-3"
        >
          <Text className="text-sm text-gray-500 dark:text-neutral-500">
            {t('profile.searchUsersPrompt')}
          </Text>
        </Pressable>

        {/* My dogs */}
        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
              {t('profile.myDogs')}
            </Text>
            {vm.dogs.length < MAX_DOGS_PER_USER && (
              <Pressable onPress={vm.navigateToAddDog}>
                <Text className="text-sm font-medium text-primary">{t('profile.addDog')}</Text>
              </Pressable>
            )}
          </View>

          {vm.dogs.length === 0 ? (
            <View className="items-center rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] p-6">
              <Text className="text-4xl">{'\u{1F436}'}</Text>
              <Text className="mt-2 text-sm text-gray-500 dark:text-neutral-500 text-center">
                {t('profile.noDogs')}
              </Text>
              <Pressable
                onPress={vm.navigateToAddDog}
                className="mt-4 rounded-2xl bg-primary px-6 py-2.5"
              >
                <Text className="font-semibold text-white">{t('profile.addYourDog')}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-3">
              {vm.dogs.map((dog) => {
                const isActive = dog.id === vm.selectedDogId;
                return (
                  <View key={dog.id} className="relative">
                    <DogProfileCard
                      name={dog.name}
                      breed={dog.breed}
                      age={formatDogAge(new Date(dog.birthDate))}
                      onPress={() => vm.navigateToDogDetail(dog.id)}
                    />
                    {/* Active dog indicator (multi-dog only) */}
                    {vm.dogs.length > 1 && (
                      <Pressable
                        onPress={() => vm.setSelectedDog(dog.id)}
                        className={`absolute right-10 top-4 rounded-full px-2 py-0.5 ${
                          isActive ? 'bg-primary' : 'bg-gray-200 dark:bg-[#48484A]'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-semibold ${
                            isActive ? 'text-white' : 'text-gray-500 dark:text-neutral-500'
                          }`}
                        >
                          {isActive ? t('profile.active') : t('profile.activate')}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Gamification XP bar */}
        {vm.xpSummary ? (
          <Pressable
            onPress={vm.navigateToGamification}
            className="mb-6 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg">{'\u2B50'}</Text>
                <Text className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F7]">
                  {vm.xpSummary.level}
                </Text>
              </View>
              <Text className="text-sm font-bold text-primary">{vm.xpSummary.totalXp} XP</Text>
            </View>
            <View className="h-2 rounded-full bg-gray-200 dark:bg-[#48484A] overflow-hidden">
              <View
                className="h-2 rounded-full bg-primary"
                style={{
                  width: `${Math.round(
                    vm.xpSummary.xpToNextLevel != null && vm.xpSummary.xpToNextLevel > 0
                      ? (vm.xpSummary.totalXp /
                          (vm.xpSummary.totalXp + vm.xpSummary.xpToNextLevel)) *
                          100
                      : 100,
                  )}%`,
                }}
              />
            </View>
            {vm.xpSummary.xpToNextLevel != null ? (
              <Text className="mt-1 text-xs text-gray-500 dark:text-neutral-500">
                {t('profile.xpToNextLevel', { count: vm.xpSummary.xpToNextLevel })}
              </Text>
            ) : null}
          </Pressable>
        ) : null}

        {/* Menu */}
        <View className="gap-1">
          <Pressable
            onPress={vm.navigateToGamification}
            className="flex-row items-center justify-between rounded-xl px-4 py-4"
          >
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('profile.menu.gamification')}
            </Text>
            <Text className="text-gray-400 dark:text-neutral-500">{'\u203A'}</Text>
          </Pressable>

          <Pressable
            onPress={vm.navigateToActivity}
            className="flex-row items-center justify-between rounded-xl px-4 py-4"
          >
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('profile.menu.activity')}
            </Text>
            <Text className="text-gray-400 dark:text-neutral-500">{'\u203A'}</Text>
          </Pressable>

          <Pressable
            onPress={vm.navigateToMatchingInsights}
            className="flex-row items-center justify-between rounded-xl px-4 py-4"
          >
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('profile.menu.matchingInsights')}
            </Text>
            <Text className="text-gray-400 dark:text-neutral-500">{'\u203A'}</Text>
          </Pressable>

          <Pressable
            onPress={vm.navigateToSettings}
            className="flex-row items-center justify-between rounded-xl px-4 py-4"
          >
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('profile.menu.settings')}
            </Text>
            <Text className="text-gray-400 dark:text-neutral-500">{'\u203A'}</Text>
          </Pressable>

          <Pressable className="flex-row items-center justify-between rounded-xl px-4 py-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('profile.menu.privacy')}
            </Text>
            <Text className="text-gray-400 dark:text-neutral-500">{'\u203A'}</Text>
          </Pressable>

          <Pressable
            onPress={vm.navigateToBlocked}
            className="flex-row items-center justify-between rounded-xl px-4 py-4"
          >
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('profile.menu.blocked')}
            </Text>
            <Text className="text-gray-400 dark:text-neutral-500">{'\u203A'}</Text>
          </Pressable>

          <Pressable className="flex-row items-center justify-between rounded-xl px-4 py-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('profile.menu.help')}
            </Text>
            <Text className="text-gray-400 dark:text-neutral-500">{'\u203A'}</Text>
          </Pressable>

          <Pressable onPress={vm.logout} className="mt-4 items-center rounded-xl py-4">
            <Text className="text-base font-medium text-red-500">{t('profile.menu.logout')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
