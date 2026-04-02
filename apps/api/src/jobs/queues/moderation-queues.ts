import { createLazyQueue } from './connection.js';

// --- Queue getters ---

export const getPhotoModerationQueue = createLazyQueue('photo-moderation', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: 500,
});

export const getContentModerationQueue = createLazyQueue('content-moderation', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: 500,
});

export const getMessageToxicityQueue = createLazyQueue('message-toxicity', {
  attempts: 2,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 200,
  removeOnFail: 500,
});

// --- Job data types ---

export interface PhotoModerationJobData {
  photoId: string;
  dogId: string;
  url: string;
}

export interface ContentModerationJobData {
  mediaId: string;
  postId: string;
  url: string;
  mediaType: 'photo' | 'video';
}

export interface MessageToxicityJobData {
  messageId: string;
  matchId: string;
  senderId: string;
  content: string;
}

export interface CommentToxicityJobData {
  commentId: string;
  postId: string;
  authorId: string;
  content: string;
}

// --- Enqueue helpers ---

export async function enqueuePhotoModeration(data: PhotoModerationJobData) {
  return getPhotoModerationQueue().add('moderate', data);
}

export async function enqueueContentModeration(data: ContentModerationJobData) {
  return getContentModerationQueue().add('moderate', data);
}

export async function enqueueMessageToxicityCheck(data: MessageToxicityJobData) {
  return getMessageToxicityQueue().add('check', data);
}

export async function enqueueCommentToxicityCheck(data: CommentToxicityJobData) {
  return getMessageToxicityQueue().add('check-comment', data);
}
