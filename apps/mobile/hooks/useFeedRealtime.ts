import { WS_EVENT } from '@pawmeet/types';
import { useRef } from 'react';
import { useWebSocketListener } from '@/hooks/useWebSocket';

interface FeedRealtimeCallbacks {
  onNewPost?: (postId: string, authorId: string) => void;
  onPostLiked?: (postId: string, likerName: string) => void;
  onPostCommented?: (postId: string, commenterName: string) => void;
  onNewStory?: (authorId: string) => void;
}

/**
 * Listens for feed-related WebSocket events on the shared connection.
 */
export function useFeedRealtime(callbacks: FeedRealtimeCallbacks) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useWebSocketListener((data) => {
    const cb = callbacksRef.current;

    switch (data.type) {
      case WS_EVENT.FEED_NEW_POST:
        cb.onNewPost?.(data.payload.postId as string, data.payload.authorId as string);
        break;
      case WS_EVENT.FEED_POST_LIKED:
        cb.onPostLiked?.(data.payload.postId as string, data.payload.likerName as string);
        break;
      case WS_EVENT.FEED_POST_COMMENTED:
        cb.onPostCommented?.(data.payload.postId as string, data.payload.commenterName as string);
        break;
      case WS_EVENT.FEED_NEW_STORY:
        cb.onNewStory?.(data.payload.authorId as string);
        break;
    }
  });
}
