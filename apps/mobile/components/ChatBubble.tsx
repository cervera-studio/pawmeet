import type { MessageStatus } from '@dogwalk/types';
import { Image, Linking, Pressable, Text, View } from 'react-native';

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
          isMine ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-gray-100'
        }`}
      >
        {/* Map placeholder */}
        <View className="h-32 items-center justify-center bg-gray-200">
          <Text className="text-3xl">📍</Text>
        </View>
        <View className="px-4 py-2">
          <Text className={`text-sm font-medium ${isMine ? 'text-white' : 'text-gray-900'}`}>
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

export function ChatBubble({ text, isMine, timestamp, mediaUrl, status }: ChatBubbleProps) {
  const location = tryParseLocation(text);

  return (
    <View className={`mb-2 max-w-[80%] ${isMine ? 'self-end' : 'self-start'}`}>
      {/* Location card */}
      {location ? (
        <LocationCard location={location} isMine={isMine} />
      ) : mediaUrl ? (
        /* Image message */
        <View
          className={`overflow-hidden rounded-2xl ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
        >
          <Image source={{ uri: mediaUrl }} className="h-48 w-64 rounded-2xl" resizeMode="cover" />
        </View>
      ) : (
        /* Text message */
        <View
          className={`rounded-2xl px-4 py-3 ${
            isMine ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-gray-100'
          }`}
        >
          <Text className={`text-base ${isMine ? 'text-white' : 'text-gray-900'}`}>{text}</Text>
        </View>
      )}

      {/* Timestamp + status */}
      <View
        className={`mt-1 flex-row items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}
      >
        <Text className="text-xs text-gray-400">{timestamp}</Text>
        {isMine && status && (
          <Text className={`text-xs ${status === 'read' ? 'text-blue-500' : 'text-gray-400'}`}>
            {STATUS_ICONS[status]}
          </Text>
        )}
      </View>
    </View>
  );
}
