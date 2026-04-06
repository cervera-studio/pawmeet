import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, Text, useColorScheme, View } from 'react-native';
import { FollowButton } from '@/components/follow-button';
import { Avatar } from '@/components/ui/Avatar';
import { useUserProfileSheetViewModel } from './_vm/user-profile-sheet.view-model';

export interface UserProfileSheetRef {
  present: (userId: string) => void;
}

interface UserProfileSheetProps {
  ref: React.Ref<UserProfileSheetRef>;
  onDismiss?: () => void;
}

export function UserProfileSheet({ ref, onDismiss }: UserProfileSheetProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const snapPoints = useMemo(() => ['70%'], []);

  const vm = useUserProfileSheetViewModel(selectedUserId);

  useImperativeHandle(ref, () => ({
    present(userId: string) {
      setSelectedUserId(userId);
      bottomSheetRef.current?.present();
    },
  }));

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  const handleDismiss = useCallback(() => {
    setSelectedUserId(null);
    onDismiss?.();
  }, [onDismiss]);

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      backgroundStyle={{ backgroundColor: isDark ? '#1C1C1E' : '#fff' }}
      handleIndicatorStyle={{ backgroundColor: isDark ? '#48484A' : '#D1D5DB', width: 40 }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {vm.loading && (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#065F46" />
          </View>
        )}

        {!vm.loading && vm.error && (
          <View className="items-center py-12">
            <Text className="text-4xl mb-3">{'\u{1F615}'}</Text>
            <Text className="text-neutral-500 dark:text-neutral-500 text-center">{vm.error}</Text>
          </View>
        )}

        {!vm.loading && !vm.error && vm.profile && (
          <View>
            {/* Avatar + Name */}
            <View className="items-center pt-2 pb-4">
              <Avatar name={vm.profile.displayName} imageUrl={vm.profile.avatarUrl} size="lg" />
              <Text className="mt-3 text-xl font-bold text-gray-900 dark:text-[#F5F5F7]">
                {vm.profile.displayName}
              </Text>

              {vm.followStatus.isFollowingMe && (
                <Text className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
                  {t('profile.followList.followsYou')}
                </Text>
              )}
            </View>

            {/* Stats row */}
            <View className="flex-row justify-center gap-6 py-3 mb-4 rounded-2xl bg-neutral-100 dark:bg-[#2C2C2E]">
              <View className="items-center">
                <Text className="text-lg font-bold text-gray-900 dark:text-[#F5F5F7]">
                  {vm.profile.followersCount}
                </Text>
                <Text className="text-xs text-neutral-500">
                  {t('userProfile.profileSheet.followers')}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-lg font-bold text-gray-900 dark:text-[#F5F5F7]">
                  {vm.profile.followingCount}
                </Text>
                <Text className="text-xs text-neutral-500">
                  {t('userProfile.profileSheet.following')}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F7]">
                  {formatDate(vm.profile.createdAt)}
                </Text>
                <Text className="text-xs text-neutral-500">
                  {t('userProfile.profileSheet.memberSince')}
                </Text>
              </View>
            </View>

            {/* Dogs section */}
            <View className="mb-4">
              <Text className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7] mb-3">
                {t('userProfile.profileSheet.dogs')}
              </Text>
              {vm.profile.dogs.length === 0 ? (
                <Text className="text-sm text-neutral-500 dark:text-neutral-500">
                  {t('userProfile.profileSheet.noDogs')}
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-3">
                  {vm.profile.dogs.map((dog) => (
                    <View
                      key={dog.id}
                      className="flex-row items-center rounded-2xl bg-neutral-100 dark:bg-[#2C2C2E] p-3 gap-3"
                      style={{ minWidth: '45%' }}
                    >
                      {dog.avatarUrl ? (
                        <Image
                          source={{ uri: dog.avatarUrl }}
                          className="h-10 w-10 rounded-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                          <Text className="text-sm font-bold text-primary">
                            {dog.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F7]">
                          {dog.name}
                        </Text>
                        <Text className="text-xs text-neutral-500" numberOfLines={1}>
                          {dog.breed} · {dog.size}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Action buttons */}
            {!vm.isCurrentUser && selectedUserId && (
              <View className="flex-row items-center gap-3 pt-2">
                <FollowButton userId={selectedUserId} size="md" />
                <Pressable
                  onPress={vm.handleBlock}
                  className="rounded-xl border border-red-300 px-5 py-2.5"
                >
                  <Text className="text-sm font-semibold text-red-500">{t('common.block')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
