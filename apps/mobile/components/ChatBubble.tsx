import type { ChatMessageReplyPreview, MessageStatus } from '@pawmeet/types';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

interface LocationData {
  type: 'location';
  latitude: number;
  longitude: number;
  label?: string;
}

interface ChatBubbleProps {
  text: string;
  isMine: boolean;
  timestamp: string;
  mediaUrl?: string | null;
  status?: MessageStatus;
  replyTo?: ChatMessageReplyPreview | null;
  onRetry?: () => void;
  onLongPress?: () => void;
}

function tryParseLocation(text: string): LocationData | null {
  try {
    const data = JSON.parse(text);
    if (data?.type === 'location' && data.latitude && data.longitude) {
      return data as LocationData;
    }
  } catch {
    // Not a location message
  }
  return null;
}

const STATUS_ICONS: Record<Exclude<MessageStatus, 'sending'>, string> = {
  sent: '\u2713',
  delivered: '\u2713\u2713',
  read: '\u2713\u2713',
  failed: '\u2715',
};

function LocationCard({ location, isMine }: { location: LocationData; isMine: boolean }) {
  const mapsUrl = `https://maps.apple.com/?ll=${location.latitude},${location.longitude}&q=${encodeURIComponent(location.label ?? 'Punto di incontro')}`;

  return (
    <Pressable onPress={() => Linking.openURL(mapsUrl)}>
      <View
        className={`overflow-hidden rounded-2xl ${
          isMine ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-gray-100 dark:bg-[#38383A]'
        }`}
      >
        <MapView
          style={{ height: 128, width: '100%' }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} />
        </MapView>
        <View className="px-4 py-2">
          <Text
            className={`text-sm font-medium ${isMine ? 'text-white' : 'text-gray-900 dark:text-[#F5F5F7]'}`}
          >
            {location.label ?? 'Punto di incontro'}
          </Text>
          <Text className={`text-xs ${isMine ? 'text-white/70' : 'text-primary'}`}>
            Tocca per aprire la mappa
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: chat bubble handles multiple message types, states, and gestures
export const ChatBubble = memo(function ChatBubble({
  text,
  isMine,
  timestamp,
  mediaUrl,
  status,
  replyTo,
  onRetry,
  onLongPress,
}: ChatBubbleProps) {
  const { t } = useTranslation();
  const location = tryParseLocation(text);
  const isFailed = status === 'failed';

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={400}
      className={`mb-2 max-w-[80%] ${isMine ? 'self-end' : 'self-start'}`}
    >
      {/* Reply preview */}
      {replyTo ? (
        <View
          className={`mb-1 rounded-lg border-l-2 px-3 py-2 ${
            isMine
              ? 'border-l-white/60 bg-primary/20'
              : 'border-l-primary bg-gray-200/60 dark:bg-[#48484A]'
          }`}
        >
          <Text
            className={`text-xs font-semibold ${isMine ? 'text-white/80' : 'text-primary'}`}
            numberOfLines={1}
          >
            {replyTo.senderName}
          </Text>
          <Text
            className={`text-xs ${
              isMine ? 'text-white/60' : 'text-gray-500 dark:text-neutral-400'
            }`}
            numberOfLines={2}
          >
            {replyTo.content}
          </Text>
        </View>
      ) : null}

      {/* Location card */}
      {location ? <LocationCard location={location} isMine={isMine} /> : null}
      {!location && mediaUrl ? (
        /* Image message */
        <View
          className={`overflow-hidden rounded-2xl ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'} ${isFailed ? 'opacity-60' : ''}`}
        >
          <Image source={{ uri: mediaUrl }} className="h-48 w-64 rounded-2xl" resizeMode="cover" />
        </View>
      ) : null}
      {location || mediaUrl ? null : (
        /* Text message */
        <View
          className={`rounded-2xl px-4 py-3 ${
            isMine ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-gray-100 dark:bg-[#38383A]'
          } ${isFailed ? 'opacity-60' : ''}`}
        >
          <Text
            className={`text-base ${isMine ? 'text-white' : 'text-gray-900 dark:text-[#F5F5F7]'}`}
          >
            {text}
          </Text>
        </View>
      )}

      {/* Timestamp + status */}
      <View
        className={`mt-1 flex-row items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}
      >
        <Text className="text-xs text-gray-400 dark:text-neutral-500">{timestamp}</Text>
        {isMine && status === 'sending' && <ActivityIndicator size={10} color="#9CA3AF" />}
        {isMine && status && status !== 'sending' && (
          <Text
            className={`text-xs ${(() => {
              if (status === 'read') return 'text-blue-500';
              if (status === 'failed') return 'text-red-500';
              return 'text-gray-400 dark:text-neutral-500';
            })()}`}
          >
            {STATUS_ICONS[status]}
          </Text>
        )}
      </View>

      {/* Retry prompt for failed messages */}
      {isFailed && onRetry ? (
        <Pressable onPress={onRetry} className="mt-1 self-end">
          <Text className="text-xs font-medium text-red-500">{t('chat.tapToRetry')}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
});

ChatBubble.displayName = 'ChatBubble';
