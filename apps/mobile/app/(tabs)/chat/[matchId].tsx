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
import { ChatBubble } from '@/components/ChatBubble';
import { ProposeWalkModal } from '@/components/ProposeWalkModal';
import { useChatConversationViewModel } from './[matchId].view-model';

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ChatLoadingSkeleton() {
  return (
    <View className="flex-1 px-4 py-2">
      {/* Incoming message */}
      <View className="mb-2 self-start max-w-[80%]">
        <View className="h-10 w-48 rounded-2xl rounded-bl-sm bg-gray-200 animate-pulse" />
      </View>
      {/* Outgoing message */}
      <View className="mb-2 self-end max-w-[80%]">
        <View className="h-10 w-40 rounded-2xl rounded-br-sm bg-gray-200 animate-pulse" />
      </View>
      {/* Incoming message */}
      <View className="mb-2 self-start max-w-[80%]">
        <View className="h-16 w-56 rounded-2xl rounded-bl-sm bg-gray-200 animate-pulse" />
      </View>
      {/* Outgoing message */}
      <View className="mb-2 self-end max-w-[80%]">
        <View className="h-10 w-32 rounded-2xl rounded-br-sm bg-gray-200 animate-pulse" />
      </View>
    </View>
  );
}

// ── Estimated item height for getItemLayout (average message bubble) ─────────

const ESTIMATED_MESSAGE_HEIGHT = 60;

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ChatConversationScreen() {
  const vm = useChatConversationViewModel();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Chat',
          headerBackTitle: 'Chat',
          headerRight: () => (
            <View className="flex-row items-center gap-1">
              {vm.connected ? (
                <View className="h-2 w-2 rounded-full bg-green-500" />
              ) : (
                <View className="h-2 w-2 rounded-full bg-gray-300" />
              )}
            </View>
          ),
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
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
                  <ChatBubble
                    text={data.text}
                    isMine={data.isMine}
                    timestamp={data.timestamp}
                    mediaUrl={data.mediaUrl}
                    status={data.status}
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
              ListEmptyComponent={
                <View className="items-center py-20">
                  <Text className="text-5xl">{'\u{1F43E}'}</Text>
                  <Text className="mt-4 text-center text-lg font-semibold text-gray-900">
                    Inizia la conversazione!
                  </Text>
                  <Text className="mt-2 text-center text-sm text-gray-500 px-8">
                    Presentati e organizza una passeggiata insieme.
                  </Text>
                </View>
              }
              ListFooterComponent={
                vm.isTyping ? (
                  <View className="mb-2 self-start">
                    <View className="rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3">
                      <Text className="text-sm text-gray-500">Sta scrivendo...</Text>
                    </View>
                  </View>
                ) : null
              }
            />
          )}

          {/* Attachment menu */}
          {vm.showAttachments && (
            <View className="flex-row gap-3 border-t border-gray-100 px-4 py-3">
              <Pressable
                onPress={vm.handlePickImage}
                className="items-center rounded-xl bg-gray-50 px-4 py-3"
              >
                <Text className="text-2xl">{'\u{1F4F7}'}</Text>
                <Text className="mt-1 text-xs text-gray-600">Foto</Text>
              </Pressable>
              <Pressable
                onPress={vm.handleSendLocation}
                className="items-center rounded-xl bg-gray-50 px-4 py-3"
              >
                <Text className="text-2xl">{'\u{1F4CD}'}</Text>
                <Text className="mt-1 text-xs text-gray-600">Posizione</Text>
              </Pressable>
              <Pressable
                onPress={vm.openWalkModal}
                className="items-center rounded-xl bg-gray-50 px-4 py-3"
              >
                <Text className="text-2xl">{'\u{1F5D3}'}</Text>
                <Text className="mt-1 text-xs text-gray-600">Passeggiata</Text>
              </Pressable>
            </View>
          )}

          {/* Input bar */}
          <View className="flex-row items-center border-t border-gray-100 px-4 py-2">
            <Pressable
              onPress={vm.toggleAttachments}
              className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-gray-100"
            >
              <Text className="text-lg">{vm.showAttachments ? '\u2715' : '+'}</Text>
            </Pressable>

            <TextInput
              value={vm.text}
              onChangeText={vm.handleTextChange}
              placeholder="Scrivi un messaggio..."
              className="mr-2 flex-1 rounded-full bg-gray-100 px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={2000}
            />

            <Pressable
              onPress={vm.handleSend}
              disabled={!vm.hasText}
              className={`h-10 w-10 items-center justify-center rounded-full ${
                vm.hasText ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <Text className={`text-lg ${vm.hasText ? 'text-white' : 'text-gray-400'}`}>
                {'\u2191'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ProposeWalkModal
        visible={vm.showWalkModal}
        matchId={vm.matchId}
        onClose={vm.closeWalkModal}
        onPropose={vm.handleProposeWalk}
      />
    </>
  );
}
