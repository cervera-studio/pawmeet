import { WS_EVENT } from '@pawmeet/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSendToUser = vi.fn();

vi.mock('../ws/chat.js', () => ({
  sendToUser: (...args: unknown[]) => mockSendToUser(...args),
}));

import { WsFeedRealtimeService } from './ws-feed-realtime-service.js';

describe('WsFeedRealtimeService', () => {
  let service: WsFeedRealtimeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WsFeedRealtimeService();
  });

  describe('notifyNewPost', () => {
    it('sends FEED_NEW_POST to all connected users except the author', () => {
      service.notifyNewPost('author-1', 'post-1', ['author-1', 'user-2', 'user-3']);

      expect(mockSendToUser).toHaveBeenCalledTimes(2);
      expect(mockSendToUser).toHaveBeenCalledWith('user-2', {
        type: WS_EVENT.FEED_NEW_POST,
        payload: { postId: 'post-1', authorId: 'author-1' },
      });
      expect(mockSendToUser).toHaveBeenCalledWith('user-3', {
        type: WS_EVENT.FEED_NEW_POST,
        payload: { postId: 'post-1', authorId: 'author-1' },
      });
    });

    it('does not send to anyone when only the author is connected', () => {
      service.notifyNewPost('author-1', 'post-1', ['author-1']);
      expect(mockSendToUser).not.toHaveBeenCalled();
    });

    it('handles empty connected user list', () => {
      service.notifyNewPost('author-1', 'post-1', []);
      expect(mockSendToUser).not.toHaveBeenCalled();
    });
  });

  describe('notifyPostLiked', () => {
    it('sends FEED_POST_LIKED to the post author', () => {
      service.notifyPostLiked('author-1', 'post-1', 'Liker Name');

      expect(mockSendToUser).toHaveBeenCalledOnce();
      expect(mockSendToUser).toHaveBeenCalledWith('author-1', {
        type: WS_EVENT.FEED_POST_LIKED,
        payload: { postId: 'post-1', likerName: 'Liker Name' },
      });
    });
  });

  describe('notifyPostCommented', () => {
    it('sends FEED_POST_COMMENTED to the post author', () => {
      service.notifyPostCommented('author-1', 'post-1', 'Commenter Name');

      expect(mockSendToUser).toHaveBeenCalledOnce();
      expect(mockSendToUser).toHaveBeenCalledWith('author-1', {
        type: WS_EVENT.FEED_POST_COMMENTED,
        payload: { postId: 'post-1', commenterName: 'Commenter Name' },
      });
    });
  });

  describe('notifyNewStory', () => {
    it('sends FEED_NEW_STORY to all connected users except the author', () => {
      service.notifyNewStory('author-1', ['author-1', 'user-2', 'user-3']);

      expect(mockSendToUser).toHaveBeenCalledTimes(2);
      expect(mockSendToUser).toHaveBeenCalledWith('user-2', {
        type: WS_EVENT.FEED_NEW_STORY,
        payload: { authorId: 'author-1' },
      });
      expect(mockSendToUser).toHaveBeenCalledWith('user-3', {
        type: WS_EVENT.FEED_NEW_STORY,
        payload: { authorId: 'author-1' },
      });
    });

    it('does not notify the author about their own story', () => {
      service.notifyNewStory('author-1', ['author-1']);
      expect(mockSendToUser).not.toHaveBeenCalled();
    });
  });
});
