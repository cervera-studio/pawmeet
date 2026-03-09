import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatBubble } from '@/components/ChatBubble';

const PLACEHOLDER_MESSAGES = [
  {
    id: '1',
    text: 'Ciao! Ho visto che anche tu hai un Golden!',
    isMine: false,
    timestamp: '14:20',
  },
  { id: '2', text: 'Si! Luna ha 3 anni, il tuo?', isMine: true, timestamp: '14:22' },
  { id: '3', text: 'Rex ne ha 4. Ci vediamo al parco alle 17?', isMine: false, timestamp: '14:30' },
];

export default function ChatConversationScreen() {
  useLocalSearchParams<{ matchId: string }>();
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;
    // TODO: inviare messaggio
    setMessage('');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Luna & Marco',
          headerBackTitle: 'Chat',
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={90}
        >
          <FlatList
            data={PLACEHOLDER_MESSAGES}
            keyExtractor={(item) => item.id}
            contentContainerClassName="px-4 py-2"
            inverted={false}
            renderItem={({ item }) => (
              <ChatBubble text={item.text} isMine={item.isMine} timestamp={item.timestamp} />
            )}
          />

          <View className="flex-row items-center border-t border-gray-100 px-4 py-2">
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Scrivi un messaggio..."
              className="mr-2 flex-1 rounded-full bg-gray-100 px-4 py-3 text-base"
              multiline
            />
            <Pressable
              onPress={handleSend}
              className="h-10 w-10 items-center justify-center rounded-full bg-primary"
            >
              <Text className="text-lg text-white">↑</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
