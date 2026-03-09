import { View, Text } from 'react-native';

interface ChatBubbleProps {
  text: string;
  isMine: boolean;
  timestamp: string;
}

export function ChatBubble({ text, isMine, timestamp }: ChatBubbleProps) {
  return (
    <View
      className={`mb-2 max-w-[80%] ${isMine ? 'self-end' : 'self-start'}`}
    >
      <View
        className={`rounded-2xl px-4 py-3 ${
          isMine ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-gray-100'
        }`}
      >
        <Text className={`text-base ${isMine ? 'text-white' : 'text-gray-900'}`}>
          {text}
        </Text>
      </View>
      <Text
        className={`mt-1 text-xs text-gray-400 ${isMine ? 'text-right' : 'text-left'}`}
      >
        {timestamp}
      </Text>
    </View>
  );
}
