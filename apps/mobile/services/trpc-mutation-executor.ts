import type { ApiClient } from '@pawmeet/api-client';
import type { ContentReportReason } from '@pawmeet/types';

/**
 * Creates a mutation executor that routes sync queue entries to the correct tRPC mutation.
 * The endpoint string follows the pattern "router.procedure" (e.g., "chat.sendMessage").
 */
export function createTrpcMutationExecutor(api: ApiClient) {
  const routes: Record<string, (payload: unknown) => Promise<unknown>> = {
    // Chat mutations
    'chat.sendMessage': (p) => {
      const { matchId, content, mediaUrl } = p as {
        matchId: string;
        content: string;
        mediaUrl?: string;
      };
      return api.chat.sendMessage.mutate({ matchId, content, mediaUrl });
    },
    'chat.markMessagesRead': (p) => {
      const { matchId } = p as { matchId: string };
      return api.chat.markMessagesRead.mutate({ matchId });
    },

    // Feed mutations
    'feed.like': (p) => {
      const { postId } = p as { postId: string };
      return api.feed.like.mutate({ postId });
    },
    'feed.createComment': (p) => {
      const { postId, content, parentId } = p as {
        postId: string;
        content: string;
        parentId?: string;
      };
      return api.feed.createComment.mutate({ postId, content, parentId });
    },
    'feed.deletePost': (p) => {
      const { postId } = p as { postId: string };
      return api.feed.deletePost.mutate({ postId });
    },
    'feed.reportContent': (p) => {
      const { contentType, contentId, reason } = p as {
        contentType: 'post' | 'comment' | 'story';
        contentId: string;
        reason: ContentReportReason;
      };
      return api.feed.reportContent.mutate({ contentType, contentId, reason });
    },
    'feed.addReaction': (p) => {
      const { contentType, contentId, emoji } = p as {
        contentType: 'post' | 'comment' | 'story';
        contentId: string;
        emoji: string;
      };
      return api.feed.addReaction.mutate({ contentType, contentId, emoji });
    },
    'feed.removeReaction': (p) => {
      const { contentType, contentId, emoji } = p as {
        contentType: 'post' | 'comment' | 'story';
        contentId: string;
        emoji: string;
      };
      return api.feed.removeReaction.mutate({ contentType, contentId, emoji });
    },
  };

  return async (endpoint: string, payload: unknown): Promise<void> => {
    const handler = routes[endpoint];
    if (!handler) {
      throw new Error(`Unknown sync endpoint: ${endpoint}`);
    }
    await handler(payload);
  };
}
