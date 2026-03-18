import { GROUP_EVENT_STATUS } from '@pawmeet/types';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import i18n from '@/lib/i18n';
import { useEventDetailViewModel } from './[eventId].view-model';
import { useEventRequestsViewModel } from './requests.view-model';

const HERO_HEIGHT = 250;
const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status: string): string {
  switch (status) {
    case GROUP_EVENT_STATUS.SCHEDULED:
      return i18n.t('events.status.scheduled');
    case GROUP_EVENT_STATUS.IN_PROGRESS:
      return i18n.t('events.status.inProgress');
    case GROUP_EVENT_STATUS.COMPLETED:
      return i18n.t('events.status.completed');
    case GROUP_EVENT_STATUS.CANCELLED:
      return i18n.t('events.status.cancelled');
    default:
      return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case GROUP_EVENT_STATUS.SCHEDULED:
      return 'bg-blue-100 text-blue-800';
    case GROUP_EVENT_STATUS.IN_PROGRESS:
      return 'bg-green-100 text-green-800';
    case GROUP_EVENT_STATUS.COMPLETED:
      return 'bg-gray-100 text-gray-500';
    case GROUP_EVENT_STATUS.CANCELLED:
      return 'bg-red-100 text-red-500';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function EventDetailSkeleton() {
  return (
    <View className="p-4">
      <View className="h-8 w-64 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      <View className="h-6 w-24 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse mt-3" />
      <View className="h-4 w-48 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mt-4" />
      <View className="h-4 w-40 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mt-2" />
      <View className="h-4 w-32 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mt-2" />
      <View className="h-20 w-full rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mt-4" />
      <View className="h-4 w-28 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mt-6" />
      <View className="flex-row gap-3 mt-3">
        <View className="h-12 w-12 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse" />
        <View className="h-12 w-12 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse" />
        <View className="h-12 w-12 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      </View>
    </View>
  );
}

// ── Pending Requests Section (organizer only) ────────────────────────────────

function PendingRequestsSection({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  const vm = useEventRequestsViewModel(eventId);

  if (vm.loading) {
    return (
      <View className="mt-6">
        <Text className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7] mb-3">
          {t('events.requests.title')}
        </Text>
        <ActivityIndicator size="small" color="#065F46" />
      </View>
    );
  }

  if (vm.requests.length === 0) {
    return (
      <View className="mt-6">
        <Text className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7] mb-3">
          {t('events.requests.title')}
        </Text>
        <Text className="text-sm text-gray-400 dark:text-neutral-500">
          {t('events.requests.noRequests')}
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-6">
      <Text className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7] mb-3">
        {t('events.requests.title')} ({vm.requests.length})
      </Text>
      {vm.requests.map((request) => {
        const userId = request.participant.userId;
        const isProcessing = vm.processingId === userId;
        return (
          <View
            key={request.participant.id}
            className="flex-row items-center rounded-xl bg-gray-50 dark:bg-[#2C2C2E] p-3 mb-2"
          >
            <Avatar name={request.displayName ?? userId} size="md" />
            <View className="ml-3 flex-1">
              <Text className="text-base font-medium text-gray-900 dark:text-[#F5F5F7]">
                {request.displayName ?? userId}
              </Text>
              {request.dogName && (
                <Text className="text-sm text-gray-500 dark:text-neutral-500">
                  {request.dogName}
                </Text>
              )}
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => vm.handleApprove(userId)}
                disabled={isProcessing}
                className="rounded-lg bg-green-500 px-3 py-2"
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-sm font-medium text-white">{t('common.approve')}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => vm.handleDecline(userId)}
                disabled={isProcessing}
                className="rounded-lg bg-red-100 dark:bg-red-900/30 px-3 py-2"
              >
                <Text className="text-sm font-medium text-red-600 dark:text-red-400">
                  {t('common.decline')}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const { t } = useTranslation();
  const vm = useEventDetailViewModel();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: vm.event?.title ?? t('events.detail.fallbackTitle'),
          headerBackTitle: t('events.detail.backButton'),
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white dark:bg-[#1C1C1E]">
        {vm.loading ? (
          <EventDetailSkeleton />
        ) : vm.event ? (
          <ScrollView className="flex-1">
            {/* Hero image (Main Event only) */}
            {vm.isOfficial ? (
              <View style={{ height: HERO_HEIGHT, width: SCREEN_WIDTH }}>
                {vm.coverImageUrl ? (
                  <Image
                    source={{ uri: vm.coverImageUrl }}
                    style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    className="bg-emerald-700"
                    style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }}
                  />
                )}
                <View className="absolute inset-0 bg-black/30" />
                <View className="absolute bottom-4 left-4 right-4">
                  <View className="flex-row items-center gap-2 mb-2">
                    <View className="rounded-full bg-amber-500 px-2.5 py-1">
                      <Text className="text-xs font-bold text-white">
                        {t('events.detail.official')}
                      </Text>
                    </View>
                    <View className={`rounded-full px-3 py-1 ${statusColor(vm.event.status)}`}>
                      <Text className="text-xs font-medium">{statusLabel(vm.event.status)}</Text>
                    </View>
                  </View>
                  <Text className="text-2xl font-bold text-white">{vm.event.title}</Text>
                </View>
              </View>
            ) : null}

            <View className="p-4">
              {/* Title + badges (non-official events) */}
              {!vm.isOfficial ? (
                <>
                  <Text className="text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
                    {vm.event.title}
                  </Text>
                  <View className="flex-row mt-3">
                    <View className={`rounded-full px-3 py-1 ${statusColor(vm.event.status)}`}>
                      <Text className="text-xs font-medium">{statusLabel(vm.event.status)}</Text>
                    </View>
                    {vm.isOrganizer && (
                      <View className="ml-2 rounded-full bg-primary/10 px-3 py-1">
                        <Text className="text-xs font-medium text-primary">
                          {t('events.detail.organizer')}
                        </Text>
                      </View>
                    )}
                    {vm.isParticipant && !vm.isOrganizer && (
                      <View className="ml-2 rounded-full bg-green-100 px-3 py-1">
                        <Text className="text-xs font-medium text-green-700">
                          {t('events.detail.participant')}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <View className="flex-row mt-1">
                  {vm.isOrganizer && (
                    <View className="rounded-full bg-primary/10 px-3 py-1">
                      <Text className="text-xs font-medium text-primary">Organizzatore</Text>
                    </View>
                  )}
                  {vm.isParticipant && !vm.isOrganizer && (
                    <View className="rounded-full bg-green-100 px-3 py-1">
                      <Text className="text-xs font-medium text-green-700">
                        {t('events.detail.enrolled')}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Organization card (official events) */}
              {vm.isOfficial && vm.organizationName ? (
                <View className="mt-4 flex-row items-center rounded-xl bg-gray-50 dark:bg-[#2C2C2E] p-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <Text className="text-lg">{'🏢'}</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-medium text-gray-900 dark:text-[#F5F5F7]">
                      {vm.organizationName}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      <View className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5">
                        <Text className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          {t('events.detail.verified')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Date, time, duration */}
              <View className="mt-4">
                <View className="flex-row items-center mb-2">
                  <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
                    {formatDate(vm.event.scheduledAt)}
                  </Text>
                </View>
                <View className="flex-row items-center mb-2">
                  <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
                    {t('events.detail.timeFormat', {
                      time: formatTime(vm.event.scheduledAt),
                      duration: vm.event.durationMin,
                    })}
                  </Text>
                </View>
              </View>

              {/* Location */}
              <View className="mt-2 flex-row items-center">
                <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
                  {vm.event.location}
                </Text>
              </View>

              {/* Map */}
              {vm.event.latitude != null && vm.event.longitude != null ? (
                <View className="mt-4 h-40 rounded-xl overflow-hidden">
                  <MapView
                    style={{ flex: 1 }}
                    initialRegion={{
                      latitude: vm.event.latitude,
                      longitude: vm.event.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: vm.event.latitude,
                        longitude: vm.event.longitude,
                      }}
                    />
                  </MapView>
                </View>
              ) : null}

              {/* Description */}
              {vm.event.description && (
                <View className="mt-4 rounded-xl bg-gray-50 dark:bg-[#2C2C2E] p-4">
                  <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
                    {vm.event.description}
                  </Text>
                </View>
              )}

              {/* Sponsor logos (official events) */}
              {vm.sponsors.length > 0 ? (
                <View className="mt-6">
                  {/* Title sponsor */}
                  {vm.sponsors
                    .filter((s) => s.tier === 'title')
                    .map((s) => (
                      <View key={s.id} className="items-center mb-4">
                        <Text className="text-xs text-gray-400 dark:text-neutral-500 mb-2">
                          {t('events.detail.presentedBy')}
                        </Text>
                        {s.organizationLogoUrl ? (
                          <Image
                            source={{ uri: s.organizationLogoUrl }}
                            className="h-12 w-40"
                            resizeMode="contain"
                          />
                        ) : (
                          <Text className="text-lg font-bold text-gray-700 dark:text-[#D1D1D6]">
                            {s.organizationName}
                          </Text>
                        )}
                      </View>
                    ))}
                  {/* Gold + Silver sponsors */}
                  {vm.sponsors.filter((s) => s.tier === 'gold' || s.tier === 'silver').length >
                  0 ? (
                    <View className="flex-row flex-wrap justify-center gap-4 mt-2">
                      {vm.sponsors
                        .filter((s) => s.tier === 'gold' || s.tier === 'silver')
                        .map((s) => (
                          <View key={s.id} className="items-center">
                            {s.organizationLogoUrl ? (
                              <Image
                                source={{ uri: s.organizationLogoUrl }}
                                className={s.tier === 'gold' ? 'h-10 w-28' : 'h-8 w-20'}
                                resizeMode="contain"
                              />
                            ) : (
                              <Text className="text-sm text-gray-600 dark:text-[#D1D1D6]">
                                {s.organizationName}
                              </Text>
                            )}
                          </View>
                        ))}
                    </View>
                  ) : null}
                  {/* Partner sponsors */}
                  {vm.sponsors.filter((s) => s.tier === 'partner').length > 0 ? (
                    <View className="mt-4">
                      <Text className="text-xs text-gray-400 dark:text-neutral-500 mb-2">
                        {t('events.detail.supportedBy')}
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {vm.sponsors
                          .filter((s) => s.tier === 'partner')
                          .map((s) => (
                            <View
                              key={s.id}
                              className="rounded-full bg-gray-100 dark:bg-[#38383A] px-3 py-1"
                            >
                              <Text className="text-xs text-gray-600 dark:text-[#D1D1D6]">
                                {s.organizationName}
                              </Text>
                            </View>
                          ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Participants */}
              <View className="mt-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7] mb-3">
                  {t('events.detail.participantsCount', {
                    current: vm.event.participantCount,
                    max: vm.event.maxParticipants,
                  })}
                </Text>
                {vm.event.participants && vm.event.participants.length > 0 ? (
                  <View className="flex-row flex-wrap gap-3">
                    {vm.event.participants.map((participant) => (
                      <View key={participant.id} className="items-center">
                        <Avatar name={participant.userId} size="md" />
                        <Text className="mt-1 text-xs text-gray-500 dark:text-neutral-500">
                          {participant.isOrganizer ? t('events.detail.organizerAbbrev') : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="text-sm text-gray-400 dark:text-neutral-500">
                    {t('events.detail.noParticipants')}
                  </Text>
                )}
              </View>

              {/* Pending requests (organizer only, requires approval events) */}
              {vm.isOrganizer && vm.event.requiresApproval && vm.eventId && (
                <PendingRequestsSection eventId={vm.eventId} />
              )}

              {/* Action buttons */}
              <View className="mt-6 gap-3">
                {/* Chat button - visible for organizer and participants */}
                {(vm.isOrganizer || vm.isParticipant) && (
                  <Pressable
                    onPress={vm.navigateToGroupChat}
                    className="items-center rounded-xl bg-primary py-4"
                  >
                    <Text className="font-semibold text-white">
                      {t('events.detail.chatButton')}
                    </Text>
                  </Pressable>
                )}

                {/* Join button */}
                {vm.canJoin && (
                  <Pressable
                    onPress={vm.handleJoin}
                    disabled={vm.actionLoading}
                    className="items-center rounded-xl bg-green-500 py-4"
                  >
                    {vm.actionLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="font-semibold text-white">
                        {t('events.detail.joinButton')}
                      </Text>
                    )}
                  </Pressable>
                )}

                {/* Leave button */}
                {vm.canLeave && (
                  <Pressable
                    onPress={vm.handleLeave}
                    disabled={vm.actionLoading}
                    className="items-center rounded-xl bg-gray-100 dark:bg-[#38383A] py-4"
                  >
                    <Text className="font-semibold text-gray-600 dark:text-[#D1D1D6]">
                      {t('events.detail.leaveButton')}
                    </Text>
                  </Pressable>
                )}

                {/* Cancel button (organizer only) */}
                {vm.canCancel && (
                  <Pressable
                    onPress={vm.handleCancel}
                    disabled={vm.actionLoading}
                    className="items-center rounded-xl bg-red-100 py-4"
                  >
                    <Text className="font-semibold text-red-600">
                      {t('events.detail.cancelButton')}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-lg text-gray-400 dark:text-neutral-500">
              {t('events.detail.notFound')}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}
