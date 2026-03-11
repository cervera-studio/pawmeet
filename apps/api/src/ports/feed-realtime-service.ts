export interface FeedRealtimeService {
  notifyNewPost(authorId: string, postId: string, connectedUserIds: string[]): void;
  notifyPostLiked(postAuthorId: string, postId: string, likerName: string): void;
  notifyPostCommented(postAuthorId: string, postId: string, commenterName: string): void;
  notifyNewStory(authorId: string, connectedUserIds: string[]): void;
}
