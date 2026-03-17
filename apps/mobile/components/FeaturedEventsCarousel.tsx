import { memo } from 'react';
import { Dimensions, Image, Pressable, ScrollView, Text, View } from 'react-native';
import type { FeaturedEvent } from '@/repositories/interfaces';

const CARD_WIDTH = Dimensions.get('window').width * 0.85;
const CARD_HEIGHT = 200;

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

const FeaturedCard = memo(function FeaturedCard({
  event,
  onPress,
}: {
  event: FeaturedEvent;
  onPress: () => void;
}) {
  const coverUrl = (event as unknown as Record<string, unknown>).coverImageUrl as string | null;

  return (
    <Pressable
      onPress={onPress}
      className="mr-3 overflow-hidden rounded-2xl"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          className="absolute inset-0"
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
          resizeMode="cover"
        />
      ) : (
        <View
          className="absolute inset-0 bg-emerald-700"
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
        />
      )}

      {/* Gradient overlay */}
      <View className="absolute inset-0 bg-black/40" />

      {/* Badge */}
      <View className="absolute top-3 left-3 rounded-full bg-amber-500 px-2.5 py-1">
        <Text className="text-xs font-bold text-white">Ufficiale</Text>
      </View>

      {/* Content */}
      <View className="absolute bottom-0 left-0 right-0 p-4">
        <Text className="text-lg font-bold text-white" numberOfLines={1}>
          {event.title}
        </Text>
        <Text className="text-sm text-white/80 mt-0.5">
          {formatDate(event.scheduledAt)} alle {formatTime(event.scheduledAt)}
        </Text>
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-sm text-white/80" numberOfLines={1}>
            {event.location}
          </Text>
          {event.participantCount != null ? (
            <Text className="text-xs text-white/70">{event.participantCount} partecipanti</Text>
          ) : null}
        </View>
        {event.organizationName ? (
          <Text className="text-xs text-white/60 mt-0.5">{event.organizationName}</Text>
        ) : null}
      </View>
    </Pressable>
  );
});

interface FeaturedEventsCarouselProps {
  events: FeaturedEvent[];
  onEventPress: (eventId: string) => void;
  onCalendarPress?: () => void;
}

export const FeaturedEventsCarousel = memo(function FeaturedEventsCarousel({
  events,
  onEventPress,
  onCalendarPress,
}: FeaturedEventsCarouselProps) {
  if (events.length === 0) return null;

  return (
    <View className="py-3">
      <View className="flex-row items-center justify-between px-4 mb-2">
        <Text className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
          In Evidenza
        </Text>
        {onCalendarPress ? (
          <Pressable onPress={onCalendarPress}>
            <Text className="text-sm font-medium text-primary">Calendario</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4"
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 12}
        snapToAlignment="start"
      >
        {events.map((event) => (
          <FeaturedCard key={event.id} event={event} onPress={() => onEventPress(event.id)} />
        ))}
      </ScrollView>
    </View>
  );
});
