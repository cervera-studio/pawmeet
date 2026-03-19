import type { MessageStatus } from '@pawmeet/types';
import { memo } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
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

const STATUS_ICONS: Record<MessageStatus, string> = {
  sent: '✓',
  delivered: '✓✓',
  read: '✓✓',
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

export const ChatBubble = memo(function ChatBubble({
  text,
  isMine,
  timestamp,
  mediaUrl,
  status,
}: ChatBubbleProps) {
  const location = tryParseLocation(text);

  return (
    <View className={`mb-2 max-w-[80%] ${isMine ? 'self-end' : 'self-start'}`}>
      {/* Location card */}
      {location ? <LocationCard location={location} isMine={isMine} /> : null}
      {!location && mediaUrl ? (
        /* Image message */
        <View
          className={`overflow-hidden rounded-2xl ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
        >
          <Image source={{ uri: mediaUrl }} className="h-48 w-64 rounded-2xl" resizeMode="cover" />
        </View>
      ) : null}
      {location || mediaUrl ? null : (
        /* Text message */
        <View
          className={`rounded-2xl px-4 py-3 ${
            isMine ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-gray-100 dark:bg-[#38383A]'
          }`}
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
        {isMine && status && (
          <Text
            className={`text-xs ${status === 'read' ? 'text-blue-500' : 'text-gray-400 dark:text-neutral-500'}`}
          >
            {STATUS_ICONS[status]}
          </Text>
        )}
      </View>
    </View>
  );
});

ChatBubble.displayName = 'ChatBubble';
