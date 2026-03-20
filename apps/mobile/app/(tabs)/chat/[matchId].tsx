import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
import { usePreventScreenCapture } from '@/hooks/useScreenSecurity';
import { useChatConversationViewModel } from './[matchId].view-model';

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ChatLoadingSkeleton() {
  return (
    <View className="flex-1 px-4 py-2">
      {/* Incoming message */}
      <View className="mb-2 self-start max-w-[80%]">
        <View className="h-10 w-48 rounded-2xl rounded-bl-sm bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      </View>
      {/* Outgoing message */}
      <View className="mb-2 self-end max-w-[80%]">
        <View className="h-10 w-40 rounded-2xl rounded-br-sm bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      </View>
      {/* Incoming message */}
      <View className="mb-2 self-start max-w-[80%]">
        <View className="h-16 w-56 rounded-2xl rounded-bl-sm bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      </View>
      {/* Outgoing message */}
      <View className="mb-2 self-end max-w-[80%]">
        <View className="h-10 w-32 rounded-2xl rounded-br-sm bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      </View>
    </View>
  );
}

// ── Estimated item height for getItemLayout (average message bubble) ─────────

const ESTIMATED_MESSAGE_HEIGHT = 60;

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ChatConversationScreen() {
  usePreventScreenCapture();
  const vm = useChatConversationViewModel();
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Chat',
          headerBackTitle: 'Chat',
          headerRight: () => (
            <View className="flex-row items-center gap-3">
              <Pressable onPress={vm.toggleSearch} hitSlop={8}>
                <Text className="text-lg">{vm.searchActive ? '\u2715' : '\u{1F50D}'}</Text>
              </Pressable>
              {vm.connected ? (
                <View className="h-2 w-2 rounded-full bg-green-500" />
              ) : (
                <View className="h-2 w-2 rounded-full bg-gray-300 dark:bg-[#48484A]" />
              )}
            </View>
          ),
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white dark:bg-[#1C1C1E]">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={90}
        >
          {/* Search bar */}
          {vm.searchActive && (
            <View className="border-b border-gray-100 dark:border-[#38383A] px-4 py-2">
              <TextInput
                value={vm.searchQuery}
                onChangeText={vm.setSearchQuery}
                placeholder={t('chat.searchPlaceholder')}
                className="rounded-full bg-gray-100 dark:bg-[#38383A] px-4 py-2 text-sm"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>
          )}

          {/* Messages */}
          {vm.loadingMessages ? (
            <ChatLoadingSkeleton />
          ) : (
            <FlatList
              ref={vm.flatListRef}
              data={vm.searchActive ? vm.filteredMessages : vm.messages}
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
                    replyTo={data.replyTo}
                    onRetry={data.status === 'failed' ? () => vm.retrySend(item.id) : undefined}
                    onLongPress={() => vm.handleReply(item)}
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
                vm.searchActive && vm.searchQuery.trim() ? (
                  <View className="items-center py-20">
                    <Text className="text-center text-sm text-gray-500 dark:text-neutral-500">
                      {t('chat.searchNoResults')}
                    </Text>
                  </View>
                ) : (
                  <View className="items-center py-20">
                    <Text className="text-5xl">{'\u{1F43E}'}</Text>
                    <Text className="mt-4 text-center text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
                      {t('chat.emptyTitle')}
                    </Text>
                    <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500 px-8">
                      {t('chat.emptyDescription')}
                    </Text>
                  </View>
                )
              }
              ListFooterComponent={
                vm.isTyping ? (
                  <View className="mb-2 self-start">
                    <View className="rounded-2xl rounded-bl-sm bg-gray-100 dark:bg-[#38383A] px-4 py-3">
                      <Text className="text-sm text-gray-500 dark:text-neutral-500">
                        {t('chat.typing')}
                      </Text>
                    </View>
                  </View>
                ) : null
              }
            />
          )}

          {/* Attachment menu */}
          {vm.showAttachments && (
            <View className="flex-row gap-3 border-t border-gray-100 dark:border-[#38383A] px-4 py-3">
              <Pressable
                onPress={vm.handlePickImage}
                className="items-center rounded-xl bg-gray-50 dark:bg-[#2C2C2E] px-4 py-3"
              >
                <Text className="text-2xl">{'\u{1F4F7}'}</Text>
                <Text className="mt-1 text-xs text-gray-600 dark:text-[#D1D1D6]">
                  {t('chat.attachments.photo')}
                </Text>
              </Pressable>
              <Pressable
                onPress={vm.handleSendLocation}
                className="items-center rounded-xl bg-gray-50 dark:bg-[#2C2C2E] px-4 py-3"
              >
                <Text className="text-2xl">{'\u{1F4CD}'}</Text>
                <Text className="mt-1 text-xs text-gray-600 dark:text-[#D1D1D6]">
                  {t('chat.attachments.location')}
                </Text>
              </Pressable>
              <Pressable
                onPress={vm.openWalkModal}
                className="items-center rounded-xl bg-gray-50 dark:bg-[#2C2C2E] px-4 py-3"
              >
                <Text className="text-2xl">{'\u{1F5D3}'}</Text>
                <Text className="mt-1 text-xs text-gray-600 dark:text-[#D1D1D6]">
                  {t('chat.attachments.walk')}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Reply banner */}
          {vm.replyingTo ? (
            <View className="flex-row items-center border-t border-gray-100 dark:border-[#38383A] px-4 py-2">
              <View className="flex-1 rounded-lg border-l-2 border-l-primary bg-gray-50 dark:bg-[#2C2C2E] px-3 py-2">
                <Text className="text-xs font-semibold text-primary" numberOfLines={1}>
                  {vm.replyingTo.senderName}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-neutral-400" numberOfLines={1}>
                  {vm.replyingTo.content}
                </Text>
              </View>
              <Pressable onPress={vm.cancelReply} className="ml-3 p-2" hitSlop={8}>
                <Text className="text-lg text-gray-400">{'\u2715'}</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Input bar */}
          <View className="flex-row items-center border-t border-gray-100 dark:border-[#38383A] px-4 py-2">
            <Pressable
              onPress={vm.toggleAttachments}
              className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-[#38383A]"
            >
              <Text className="text-lg">{vm.showAttachments ? '\u2715' : '+'}</Text>
            </Pressable>

            <TextInput
              value={vm.text}
              onChangeText={vm.handleTextChange}
              placeholder={t('chat.messagePlaceholder')}
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

      <ProposeWalkModal
        visible={vm.showWalkModal}
        matchId={vm.matchId ?? ''}
        onClose={vm.closeWalkModal}
        onPropose={vm.handleProposeWalk}
      />
    </>
  );
}
