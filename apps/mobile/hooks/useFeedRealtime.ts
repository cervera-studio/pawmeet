import { WS_EVENT, type WsMessage } from '@dogwalk/types';
import { logger } from '@dogwalk/utils';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';

function getWsUrl(): string {
  const url = process.env.EXPO_PUBLIC_WS_URL;
  if (!url && !__DEV__) {
    throw new Error('EXPO_PUBLIC_WS_URL is required in production');
  }
  return url ?? 'ws://localhost:3000/ws';
}

const WS_URL = getWsUrl();

interface FeedRealtimeCallbacks {
  onNewPost?: (postId: string, authorId: string) => void;
  onPostLiked?: (postId: string, likerName: string) => void;
  onPostCommented?: (postId: string, commenterName: string) => void;
  onNewStory?: (authorId: string) => void;
}

/**
 * Listens for feed-related WebSocket events.
 * Opens a dedicated connection for feed updates.
 */
export function useFeedRealtime(callbacks: FeedRealtimeCallbacks) {
  const token = useAuthStore((s) => s.token);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(WS_URL, [`access_token.${token}`]);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsMessage;
        const cb = callbacksRef.current;

        switch (data.type) {
          case WS_EVENT.FEED_NEW_POST:
            cb.onNewPost?.(
              data.payload.postId as string,
              data.payload.authorId as string,
            );
            break;
          case WS_EVENT.FEED_POST_LIKED:
            cb.onPostLiked?.(
              data.payload.postId as string,
              data.payload.likerName as string,
            );
            break;
          case WS_EVENT.FEED_POST_COMMENTED:
            cb.onPostCommented?.(
              data.payload.postId as string,
              data.payload.commenterName as string,
            );
            break;
          case WS_EVENT.FEED_NEW_STORY:
            cb.onNewStory?.(data.payload.authorId as string);
            break;
        }
      } catch (e) {
        logger.debug('useFeedRealtime', 'Malformed WS message', e);
      }
    };

    ws.onerror = (e) => {
      logger.debug('useFeedRealtime', 'WS error', e);
    };

    return () => {
      ws.close();
    };
  }, [token]);
}
