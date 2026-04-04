import type { RouterOutput } from '@pawmeet/api-client';
import { MESSAGE_KIND, MESSAGE_STATUS } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import * as Crypto from 'expo-crypto';
import { useCallback } from 'react';
import { container } from 'tsyringe';
import { getSharedWs } from '@/hooks/useWebSocket';
import { CHAT_REPOSITORY } from '@/repositories/tokens';
import type { PendingMeta } from './useMessages';

const chatRepo = container.resolve(CHAT_REPOSITORY);

type Message = RouterOutput['chat']['getMessages']['messages'][number];

/** Build a location-sharing message content string with coordinate rounding. */
function buildLocationContent(latitude: number, longitude: number, label?: string): string {
  const roundedLat = Math.round(latitude * 200) / 200;
  const roundedLng = Math.round(longitude * 200) / 200;
  return JSON.stringify({
    type: 'location',
    latitude: roundedLat,
    longitude: roundedLng,
    label,
  });
}

interface MessageSenderDeps {
  createOptimisticMessage: (tempId: string, content: string, mediaUrl?: string) => Message;
  replaceOptimistic: (tempId: string, real: Message) => void;
  markFailed: (tempId: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  pendingMetaRef: React.RefObject<Map<string, PendingMeta>>;
}

export function useMessageSender(matchId: string | undefined, deps: MessageSenderDeps) {
  const { createOptimisticMessage, replaceOptimistic, markFailed, setMessages, pendingMetaRef } =
    deps;

  // Send text message (optimistic)
  const sendMessage = useCallback(
    async (content: string, replyToId?: string) => {
      if (!(matchId && content.trim())) return;
      const tempId = Crypto.randomUUID();
      const optimistic = createOptimisticMessage(tempId, content);
      pendingMetaRef.current.set(tempId, { content, kind: MESSAGE_KIND.TEXT });
      setMessages((prev) => [...prev, optimistic]);

      try {
        const { message: msg } = await chatRepo.sendMessage({
          matchId,
          content,
          replyToId,
        });
        // Broadcast over WebSocket for real-time sync
        getSharedWs()?.send(JSON.stringify({ type: 'message', payload: msg }));
        replaceOptimistic(tempId, msg as Message);
      } catch (e) {
        logger.warn('useMessageSender', 'Failed to send message', e);
        markFailed(tempId);
      }
    },
    [matchId, createOptimisticMessage, replaceOptimistic, markFailed, setMessages, pendingMetaRef],
  );

  // Send image message (optimistic)
  const sendImage = useCallback(
    async (imageUri: string) => {
      if (!matchId) return;
      const tempId = Crypto.randomUUID();
      const optimistic = createOptimisticMessage(tempId, '', imageUri);
      pendingMetaRef.current.set(tempId, { content: '', imageUri, kind: MESSAGE_KIND.IMAGE });
      setMessages((prev) => [...prev, optimistic]);

      try {
        const { mediaUrl } = await chatRepo.uploadImage(matchId, imageUri);
        const { message: msg } = await chatRepo.sendMessage({
          matchId,
          content: '📷',
          mediaUrl,
        });
        getSharedWs()?.send(JSON.stringify({ type: 'message', payload: msg }));
        replaceOptimistic(tempId, msg as Message);
      } catch (e) {
        logger.error('useMessageSender', 'Failed to send image', e);
        markFailed(tempId);
      }
    },
    [matchId, createOptimisticMessage, replaceOptimistic, markFailed, setMessages, pendingMetaRef],
  );

  // Send location message (optimistic)
  const sendLocation = useCallback(
    async (latitude: number, longitude: number, label?: string) => {
      if (!matchId) return;
      const tempId = Crypto.randomUUID();
      const content = buildLocationContent(latitude, longitude, label);
      const optimistic = createOptimisticMessage(tempId, content);
      pendingMetaRef.current.set(tempId, {
        content,
        latitude,
        longitude,
        locationLabel: label,
        kind: MESSAGE_KIND.LOCATION,
      });
      setMessages((prev) => [...prev, optimistic]);

      try {
        const { message: msg } = await chatRepo.sendMessage({ matchId, content });
        getSharedWs()?.send(JSON.stringify({ type: 'message', payload: msg }));
        replaceOptimistic(tempId, msg as Message);
      } catch (e) {
        logger.warn('useMessageSender', 'Failed to send location', e);
        markFailed(tempId);
      }
    },
    [matchId, createOptimisticMessage, replaceOptimistic, markFailed, setMessages, pendingMetaRef],
  );

  // Retry a failed message
  const retrySend = useCallback(
    async (tempId: string) => {
      if (!matchId) return;
      const meta = pendingMetaRef.current.get(tempId);
      if (!meta) return;

      // Reset status back to "sending"
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: MESSAGE_STATUS.SENDING } : m)),
      );

      try {
        let msg: Message;
        switch (meta.kind) {
          case MESSAGE_KIND.IMAGE: {
            // biome-ignore lint/style/noNonNullAssertion: imageUri is always set when kind === 'image'
            const { mediaUrl } = await chatRepo.uploadImage(matchId, meta.imageUri!);
            const result = await chatRepo.sendMessage({ matchId, content: '', mediaUrl });
            msg = result.message as Message;
            break;
          }
          case MESSAGE_KIND.LOCATION:
          case MESSAGE_KIND.TEXT: {
            const result = await chatRepo.sendMessage({ matchId, content: meta.content });
            msg = result.message as Message;
            break;
          }
        }
        replaceOptimistic(tempId, msg);
      } catch (e) {
        logger.warn('useMessageSender', `Failed to retry message ${tempId}`, e);
        markFailed(tempId);
      }
    },
    [matchId, replaceOptimistic, markFailed, setMessages, pendingMetaRef],
  );

  return {
    sendMessage,
    sendImage,
    sendLocation,
    retrySend,
  };
}
