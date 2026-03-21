'use client';

import {
  ADMIN_WS_EVENT,
  type AdminWsMessage,
  type ModerationAction,
  type ModerationQueue,
} from '@pawmeet/types';
import { useCallback } from 'react';
import { useAdminWs } from './use-admin-ws';

interface UseModerationWsOptions {
  onNewItem?: (queue: ModerationQueue, payload: Record<string, unknown>) => void;
  onItemActioned?: (
    queue: ModerationQueue,
    itemId: string,
    action: ModerationAction,
    adminId: string,
  ) => void;
}

const EVENT_TO_QUEUE: Partial<Record<string, ModerationQueue>> = {
  [ADMIN_WS_EVENT.MODERATION_NEW_PHOTO]: 'photos',
  [ADMIN_WS_EVENT.MODERATION_NEW_REPORT]: 'reports',
  [ADMIN_WS_EVENT.MODERATION_NEW_POST]: 'feed',
  [ADMIN_WS_EVENT.MODERATION_NEW_STORY]: 'stories',
  [ADMIN_WS_EVENT.MODERATION_NEW_CONTENT_REPORT]: 'content',
  [ADMIN_WS_EVENT.MODERATION_NEW_CHAT_REPORT]: 'chat',
};

export function useModerationWs({ onNewItem, onItemActioned }: UseModerationWsOptions) {
  const handleMessage = useCallback(
    (message: AdminWsMessage) => {
      if (message.type === ADMIN_WS_EVENT.MODERATION_ITEM_ACTIONED) {
        const { queue, itemId, action, adminId } = message.payload;
        onItemActioned?.(queue, itemId, action, adminId);
        return;
      }

      const queue = EVENT_TO_QUEUE[message.type];
      if (queue) {
        onNewItem?.(queue, message.payload as Record<string, unknown>);
      }
    },
    [onNewItem, onItemActioned],
  );

  const { isConnected } = useAdminWs(handleMessage);

  return { isConnected };
}
