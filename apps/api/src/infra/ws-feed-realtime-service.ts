import { WS_EVENT } from '@pawmeet/types';
import type { FeedRealtimeService } from '../ports/feed-realtime-service.js';
// biome-ignore lint/suspicious/noImportCycles: ws ↔ infra cycle requires architectural refactor
import { sendToUser } from '../ws/chat.js';

export class WsFeedRealtimeService implements FeedRealtimeService {
  notifyNewPost(authorId: string, postId: string, connectedUserIds: string[]): void {
    for (const userId of connectedUserIds) {
      if (userId !== authorId) {
        sendToUser(userId, {
          type: WS_EVENT.FEED_NEW_POST,
          payload: { postId, authorId },
        });
      }
    }
  }

  notifyPostLiked(postAuthorId: string, postId: string, likerName: string): void {
    sendToUser(postAuthorId, {
      type: WS_EVENT.FEED_POST_LIKED,
      payload: { postId, likerName },
    });
  }

  notifyPostCommented(postAuthorId: string, postId: string, commenterName: string): void {
    sendToUser(postAuthorId, {
      type: WS_EVENT.FEED_POST_COMMENTED,
      payload: { postId, commenterName },
    });
  }

  notifyNewStory(authorId: string, connectedUserIds: string[]): void {
    for (const userId of connectedUserIds) {
      if (userId !== authorId) {
        sendToUser(userId, {
          type: WS_EVENT.FEED_NEW_STORY,
          payload: { authorId },
        });
      }
    }
  }
}
