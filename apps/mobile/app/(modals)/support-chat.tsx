import type { RouterOutput } from '@pawmeet/api-client';
import { memo } from 'react';

type SupportMsg = RouterOutput['support']['getTicketMessages']['messages'][number];

import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
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
import { useSupportChatViewModel } from './_vm/support-chat.view-model';

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

/** Read receipt indicator for user messages: double check if read, single check if sent */
function ReadReceipt({ message }: { message: SupportMsg }) {
  if (message.senderType !== 'user') return null;

  return (
    <Text
      className={`ml-1 text-xs ${message.readAt ? 'text-primary' : 'text-gray-400 dark:text-neutral-500'}`}
    >
      {message.readAt ? '✓✓' : '✓'}
    </Text>
  );
}

const SupportBubble = memo(function SupportBubble({ message }: { message: SupportMsg }) {
  if (message.senderType === 'system') {
    return (
      <View className="mb-3 items-center px-6">
        <Text className="text-xs text-gray-400 dark:text-neutral-500 text-center">
          {message.content}
        </Text>
      </View>
    );
  }

  const isMine = message.senderType === 'user';

  return (
    <View className={`mb-2 max-w-[80%] px-4 ${isMine ? 'self-end' : 'self-start'}`}>
      <View
        className={`rounded-2xl px-4 py-3 ${
          isMine ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-gray-100 dark:bg-[#38383A]'
        }`}
      >
        <Text
          className={`text-base ${isMine ? 'text-white' : 'text-gray-900 dark:text-[#F5F5F7]'}`}
        >
          {message.content}
        </Text>
      </View>
      <View className={`mt-1 flex-row ${isMine ? 'justify-end' : 'justify-start'}`}>
        <Text className="text-xs text-gray-400 dark:text-neutral-500">
          {formatDate(message.createdAt)} {formatTime(message.createdAt)}
        </Text>
        <ReadReceipt message={message} />
      </View>
    </View>
  );
});

SupportBubble.displayName = 'SupportBubble';

export default function SupportChatModal() {
  usePreventScreenCapture();
  const { t } = useTranslation();
  const vm = useSupportChatViewModel();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header with ticket status */}
        {vm.ticket ? (
          <View className="border-b border-gray-100 dark:border-[#38383A] px-6 py-3">
            <Text
              className="text-base font-medium text-gray-900 dark:text-[#F5F5F7]"
              numberOfLines={1}
            >
              {vm.ticket.subject}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t(`support.status.${vm.ticket.status}`)}
            </Text>
          </View>
        ) : null}

        {/* Closed ticket banner */}
        {vm.isClosed ? (
          <View className="bg-gray-100 dark:bg-[#38383A] px-6 py-3">
            <Text className="text-center text-sm text-gray-500 dark:text-neutral-400">
              {t('support.ticketClosed')}
            </Text>
          </View>
        ) : null}

        {/* Typing indicator */}
        {vm.isTyping ? (
          <View className="px-6 py-2">
            <Text className="text-xs text-gray-400 dark:text-neutral-500 italic">
              {t('support.typing')}
            </Text>
          </View>
        ) : null}

        {/* Messages */}
        {vm.loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#065F46" />
          </View>
        ) : (
          <FlatList
            data={vm.messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <SupportBubble message={item} />}
            inverted
            contentContainerClassName="py-4"
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-12">
                <Text className="text-center text-sm text-gray-400 dark:text-neutral-500">
                  {t('support.chatEmpty')}
                </Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        {vm.isClosed ? null : (
          <View className="flex-row items-end gap-2 border-t border-gray-100 dark:border-[#38383A] px-4 py-3">
            <TextInput
              className="min-h-[40px] max-h-[100px] flex-1 rounded-2xl bg-gray-100 dark:bg-[#38383A] px-4 py-2.5 text-base text-gray-900 dark:text-[#F5F5F7]"
              placeholder={t('support.inputPlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={vm.inputText}
              onChangeText={vm.setInputText}
              multiline
              maxLength={2000}
              editable={!vm.sending}
            />
            <Pressable
              onPress={vm.handleSend}
              disabled={!vm.inputText.trim() || vm.sending}
              className={`h-10 w-10 items-center justify-center rounded-full ${
                vm.inputText.trim() && !vm.sending ? 'bg-primary' : 'bg-gray-200 dark:bg-[#38383A]'
              }`}
            >
              {vm.sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-base font-bold text-white">↑</Text>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
