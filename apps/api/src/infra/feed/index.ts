import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { FeedRepository } from '../../ports/feed-repository.js';
import { DrizzleFeedCommentRepository } from './drizzle-feed-comment-repository.js';
import { DrizzleFeedHashtagRepository } from './drizzle-feed-hashtag-repository.js';
import { DrizzleFeedLikeRepository } from './drizzle-feed-like-repository.js';
import { DrizzleFeedMediaRepository } from './drizzle-feed-media-repository.js';
import { DrizzleFeedPostRepository } from './drizzle-feed-post-repository.js';
import { DrizzleFeedReactionRepository } from './drizzle-feed-reaction-repository.js';
import { DrizzleFeedTagRepository } from './drizzle-feed-tag-repository.js';

export class DrizzleFeedRepository implements FeedRepository {
  private readonly post: DrizzleFeedPostRepository;
  private readonly media: DrizzleFeedMediaRepository;
  private readonly like: DrizzleFeedLikeRepository;
  private readonly comment: DrizzleFeedCommentRepository;
  private readonly tag: DrizzleFeedTagRepository;
  private readonly reaction: DrizzleFeedReactionRepository;
  private readonly hashtag: DrizzleFeedHashtagRepository;

  constructor(db: NodePgDatabase) {
    this.post = new DrizzleFeedPostRepository(db);
    this.media = new DrizzleFeedMediaRepository(db);
    this.like = new DrizzleFeedLikeRepository(db);
    this.comment = new DrizzleFeedCommentRepository(db);
    this.tag = new DrizzleFeedTagRepository(db);
    this.reaction = new DrizzleFeedReactionRepository(db);
    this.hashtag = new DrizzleFeedHashtagRepository(db);
  }

  // ── Post ──────────────────────────────────────────────────────────────────────
  createPost = (...a: Parameters<FeedRepository['createPost']>) => this.post.createPost(...a);
  findPostById = (...a: Parameters<FeedRepository['findPostById']>) => this.post.findPostById(...a);
  findPostWithAuthor = (...a: Parameters<FeedRepository['findPostWithAuthor']>) =>
    this.post.findPostWithAuthor(...a);
  softDeletePost = (...a: Parameters<FeedRepository['softDeletePost']>) =>
    this.post.softDeletePost(...a);
  getFeedForUser = (...a: Parameters<FeedRepository['getFeedForUser']>) =>
    this.post.getFeedForUser(...a);
  getUserPosts = (...a: Parameters<FeedRepository['getUserPosts']>) => this.post.getUserPosts(...a);
  getConnectedUserIds = (...a: Parameters<FeedRepository['getConnectedUserIds']>) =>
    this.post.getConnectedUserIds(...a);

  // ── Media ─────────────────────────────────────────────────────────────────────
  addMedia = (...a: Parameters<FeedRepository['addMedia']>) => this.media.addMedia(...a);
  findMediaByPost = (...a: Parameters<FeedRepository['findMediaByPost']>) =>
    this.media.findMediaByPost(...a);
  countMediaByPost = (...a: Parameters<FeedRepository['countMediaByPost']>) =>
    this.media.countMediaByPost(...a);
  updateMediaModerationStatus = (...a: Parameters<FeedRepository['updateMediaModerationStatus']>) =>
    this.media.updateMediaModerationStatus(...a);

  // ── Likes ─────────────────────────────────────────────────────────────────────
  addLike = (...a: Parameters<FeedRepository['addLike']>) => this.like.addLike(...a);
  removeLike = (...a: Parameters<FeedRepository['removeLike']>) => this.like.removeLike(...a);
  hasLiked = (...a: Parameters<FeedRepository['hasLiked']>) => this.like.hasLiked(...a);

  // ── Comments ──────────────────────────────────────────────────────────────────
  addComment = (...a: Parameters<FeedRepository['addComment']>) => this.comment.addComment(...a);
  findCommentById = (...a: Parameters<FeedRepository['findCommentById']>) =>
    this.comment.findCommentById(...a);
  softDeleteComment = (...a: Parameters<FeedRepository['softDeleteComment']>) =>
    this.comment.softDeleteComment(...a);
  getComments = (...a: Parameters<FeedRepository['getComments']>) => this.comment.getComments(...a);

  // ── Tags ──────────────────────────────────────────────────────────────────────
  addTags = (...a: Parameters<FeedRepository['addTags']>) => this.tag.addTags(...a);
  removeTags = (...a: Parameters<FeedRepository['removeTags']>) => this.tag.removeTags(...a);
  getResolvedTags = (...a: Parameters<FeedRepository['getResolvedTags']>) =>
    this.tag.getResolvedTags(...a);
  findTagById = (...a: Parameters<FeedRepository['findTagById']>) => this.tag.findTagById(...a);

  // ── Reactions ─────────────────────────────────────────────────────────────────
  addReaction = (...a: Parameters<FeedRepository['addReaction']>) =>
    this.reaction.addReaction(...a);
  removeReaction = (...a: Parameters<FeedRepository['removeReaction']>) =>
    this.reaction.removeReaction(...a);

  // ── Hashtags ──────────────────────────────────────────────────────────────────
  searchPostsByHashtag = (...a: Parameters<FeedRepository['searchPostsByHashtag']>) =>
    this.hashtag.searchPostsByHashtag(...a);
  getTrendingHashtags = (...a: Parameters<FeedRepository['getTrendingHashtags']>) =>
    this.hashtag.getTrendingHashtags(...a);
}
