import { Stack } from 'expo-router';
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
import { usePreventScreenCapture } from '@/hooks/useScreenSecurity';
import { useGroupChatConversationViewModel } from './[eventId].view-model';

// ── Loading skeleton ─────────────────────────────────────────────────────────

function ChatLoadingSkeleton() {
  return (
    <View className="flex-1 px-4 py-2">
      <View className="mb-2 self-start max-w-[80%]">
        <View className="h-4 w-16 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mb-1" />
        <View className="h-10 w-48 rounded-2xl rounded-bl-sm bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      </View>
      <View className="mb-2 self-end max-w-[80%]">
        <View className="h-10 w-40 rounded-2xl rounded-br-sm bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      </View>
      <View className="mb-2 self-start max-w-[80%]">
        <View className="h-4 w-20 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mb-1" />
        <View className="h-16 w-56 rounded-2xl rounded-bl-sm bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      </View>
    </View>
  );
}

// ── Estimated item height ────────────────────────────────────────────────────

const ESTIMATED_MESSAGE_HEIGHT = 70;

// ── Group chat bubble (shows sender name) ────────────────────────────────────

function GroupChatBubble({
  text,
  isMine,
  timestamp,
  senderId,
}: {
  text: string;
  isMine: boolean;
  timestamp: string;
  senderId: string;
}) {
  return (
    <View className={`mb-2 max-w-[80%] ${isMine ? 'self-end' : 'self-start'}`}>
      {/* Sender name (only for other users' messages) */}
      {!isMine && (
        <Text className="mb-1 text-xs font-medium text-gray-400 dark:text-neutral-500">
          {senderId.slice(0, 8)}
        </Text>
      )}

      {/* Message bubble */}
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

      {/* Timestamp */}
      <View className={`mt-1 flex-row items-center ${isMine ? 'justify-end' : 'justify-start'}`}>
        <Text className="text-xs text-gray-400 dark:text-neutral-500">{timestamp}</Text>
      </View>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function GroupChatConversationScreen() {
  usePreventScreenCapture();
  const vm = useGroupChatConversationViewModel();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Chat di gruppo',
          headerBackTitle: 'Chat',
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white dark:bg-[#1C1C1E]">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={90}
        >
          {/* Messages */}
          {vm.loadingMessages ? (
            <ChatLoadingSkeleton />
          ) : (
            <FlatList
              ref={vm.flatListRef}
              data={vm.messages}
              keyExtractor={(item) => item.id}
              contentContainerClassName="px-4 py-2"
              renderItem={({ item }) => {
                const data = vm.renderItem({ item });
                return (
                  <GroupChatBubble
                    text={data.text}
                    isMine={data.isMine}
                    timestamp={data.timestamp}
                    senderId={data.senderId}
                  />
                );
              }}
              getItemLayout={(_data: unknown, index: number) => ({
                length: ESTIMATED_MESSAGE_HEIGHT,
                offset: ESTIMATED_MESSAGE_HEIGHT * index,
                index,
              })}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={11}
              onEndReached={vm.hasMore ? vm.handleLoadMore : undefined}
              onEndReachedThreshold={0.3}
              ListEmptyComponent={
                <View className="items-center py-20">
                  <Text className="text-5xl">{'\u{1F43E}'}</Text>
                  <Text className="mt-4 text-center text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
                    Chat di gruppo
                  </Text>
                  <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500 px-8">
                    Scrivi un messaggio per coordinare la passeggiata!
                  </Text>
                </View>
              }
            />
          )}

          {/* Input bar */}
          <View className="flex-row items-center border-t border-gray-100 dark:border-[#38383A] px-4 py-2">
            <TextInput
              value={vm.text}
              onChangeText={vm.handleTextChange}
              placeholder="Scrivi un messaggio..."
              className="mr-2 flex-1 rounded-full bg-gray-100 dark:bg-[#38383A] px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={2000}
            />

            <Pressable
              onPress={vm.handleSend}
              disabled={!vm.hasText}
              className={`h-10 w-10 items-center justify-center rounded-full ${
                vm.hasText ? 'bg-primary' : 'bg-gray-200 dark:bg-[#48484A]'
              }`}
            >
              <Text
                className={`text-lg ${vm.hasText ? 'text-white' : 'text-gray-400 dark:text-neutral-500'}`}
              >
                {'\u2191'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
