import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { ChatBubble } from '@/components/ChatBubble';
import { ProposeWalkModal } from '@/components/ProposeWalkModal';
import { useChat } from '@/hooks/useChat';
import { useLocation } from '@/hooks/useLocation';
import { useWalks } from '@/hooks/useWalks';
import { useAuthStore } from '@/stores/auth';

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatConversationScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const {
    messages,
    isTyping,
    connected,
    loadingMessages,
    fetchMessages,
    sendMessage,
    sendImage,
    sendLocation,
    sendTyping,
    markAsRead,
  } = useChat(matchId);
  const { coordinates, getCurrentLocation } = useLocation();
  const { proposeWalk } = useWalks();
  const [text, setText] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [showWalkModal, setShowWalkModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchMessages();
    markAsRead();
  }, [fetchMessages, markAsRead]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleTextChange = (value: string) => {
    setText(value);
    // Send typing indicator
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 2000);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(text.trim());
    setText('');
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handlePickImage = useCallback(async () => {
    setShowAttachments(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      sendImage(result.assets[0].uri);
    }
  }, [sendImage]);

  const handleSendLocation = useCallback(async () => {
    setShowAttachments(false);
    let coords = coordinates;
    if (!coords) {
      coords = await getCurrentLocation();
    }
    if (coords) {
      sendLocation(coords.latitude, coords.longitude, 'Punto di incontro');
    }
  }, [coordinates, getCurrentLocation, sendLocation]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Chat',
          headerBackTitle: 'Chat',
          headerRight: () => (
            <View className="flex-row items-center gap-1">
              {connected ? (
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
          {loadingMessages ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#FF6B35" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerClassName="px-4 py-2"
              renderItem={({ item }) => (
                <ChatBubble
                  text={item.content}
                  isMine={item.senderId === userId}
                  timestamp={formatTime(item.createdAt)}
                  mediaUrl={item.mediaUrl}
                  status={item.senderId === userId ? item.status : undefined}
                />
              )}
              ListEmptyComponent={
                <View className="items-center py-20">
                  <Text className="text-5xl">🐾</Text>
                  <Text className="mt-4 text-center text-sm text-gray-400">
                    Inizia la conversazione! Organizza una passeggiata insieme.
                  </Text>
                </View>
              }
              ListFooterComponent={
                isTyping ? (
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
          {showAttachments && (
            <View className="flex-row gap-3 border-t border-gray-100 px-4 py-3">
              <Pressable
                onPress={handlePickImage}
                className="items-center rounded-xl bg-gray-50 px-4 py-3"
              >
                <Text className="text-2xl">📷</Text>
                <Text className="mt-1 text-xs text-gray-600">Foto</Text>
              </Pressable>
              <Pressable
                onPress={handleSendLocation}
                className="items-center rounded-xl bg-gray-50 px-4 py-3"
              >
                <Text className="text-2xl">📍</Text>
                <Text className="mt-1 text-xs text-gray-600">Posizione</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowAttachments(false);
                  setShowWalkModal(true);
                }}
                className="items-center rounded-xl bg-gray-50 px-4 py-3"
              >
                <Text className="text-2xl">🗓️</Text>
                <Text className="mt-1 text-xs text-gray-600">Passeggiata</Text>
              </Pressable>
            </View>
          )}

          {/* Input bar */}
          <View className="flex-row items-center border-t border-gray-100 px-4 py-2">
            <Pressable
              onPress={() => setShowAttachments(!showAttachments)}
              className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-gray-100"
            >
              <Text className="text-lg">{showAttachments ? '✕' : '+'}</Text>
            </Pressable>

            <TextInput
              value={text}
              onChangeText={handleTextChange}
              placeholder="Scrivi un messaggio..."
              className="mr-2 flex-1 rounded-full bg-gray-100 px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={2000}
            />

            <Pressable
              onPress={handleSend}
              disabled={!text.trim()}
              className={`h-10 w-10 items-center justify-center rounded-full ${
                text.trim() ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <Text className={`text-lg ${text.trim() ? 'text-white' : 'text-gray-400'}`}>↑</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ProposeWalkModal
        visible={showWalkModal}
        matchId={matchId}
        onClose={() => setShowWalkModal(false)}
        onPropose={async (input) => { await proposeWalk(input); }}
      />
    </>
  );
}
