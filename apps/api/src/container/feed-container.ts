// Feed domain: posts, stories, comments, likes, content reports

import { createAddContentReaction } from '../use-cases/add-content-reaction.js';
import { createAddPostTags } from '../use-cases/add-post-tags.js';
import { createConfirmPostMedia } from '../use-cases/confirm-post-media.js';
import { createConfirmStory } from '../use-cases/confirm-story.js';
import { createCreateComment } from '../use-cases/create-comment.js';
import { createCreatePost } from '../use-cases/create-post.js';
import { createCreateStory } from '../use-cases/create-story.js';
import { createDeleteComment } from '../use-cases/delete-comment.js';
import { createDeletePost } from '../use-cases/delete-post.js';
import { createGetFeed } from '../use-cases/get-feed.js';
import { createGetFeedStories } from '../use-cases/get-feed-stories.js';
import { createGetPendingReports } from '../use-cases/get-pending-reports.js';
import { createGetPostComments } from '../use-cases/get-post-comments.js';
import { createGetPostDetail } from '../use-cases/get-post-detail.js';
import { createGetStoryViewers } from '../use-cases/get-story-viewers.js';
import { createGetTrendingHashtags } from '../use-cases/get-trending-hashtags.js';
import { createGetUserPosts } from '../use-cases/get-user-posts.js';
import { createGetWalkAlbum } from '../use-cases/get-walk-album.js';
import { createLikePost } from '../use-cases/like-post.js';
import { createRemoveContentReaction } from '../use-cases/remove-content-reaction.js';
import { createRemovePostTag } from '../use-cases/remove-post-tag.js';
import { createReportContent } from '../use-cases/report-content.js';
import { createReviewContentReport } from '../use-cases/review-content-report.js';
import { createSearchByHashtag } from '../use-cases/search-by-hashtag.js';
import { createUploadPostMediaUrl } from '../use-cases/upload-post-media-url.js';
import { createViewStory } from '../use-cases/view-story.js';
import { awardXp } from './gamification-container.js';
import {
  contentReportRepo,
  feedRealtime,
  feedRepo,
  notificationService,
  redis,
  storage,
  storyRepo,
  userRepo,
  walkAlbumRepo,
} from './services.js';

export const feedDeps = {
  createPost: createCreatePost({ feedRepo, feedRealtime, awardXp }),
  deletePost: createDeletePost({ feedRepo }),
  getFeed: createGetFeed({ feedRepo }),
  getUserPosts: createGetUserPosts({ feedRepo }),
  getPostDetail: createGetPostDetail({ feedRepo }),
  uploadPostMediaUrl: createUploadPostMediaUrl({ feedRepo, storage }),
  confirmPostMedia: createConfirmPostMedia({ feedRepo, storage }),
  likePost: createLikePost({ feedRepo, userRepo, notificationService, feedRealtime }),
  createComment: createCreateComment({ feedRepo, userRepo, notificationService, feedRealtime }),
  deleteComment: createDeleteComment({ feedRepo }),
  getPostComments: createGetPostComments({ feedRepo }),
  createStory: createCreateStory({ storyRepo, storage }),
  confirmStory: createConfirmStory({ storyRepo, storage, awardXp }),
  getFeedStories: createGetFeedStories({ storyRepo }),
  viewStory: createViewStory({ storyRepo }),
  getStoryViewers: createGetStoryViewers({ storyRepo }),
  reportContent: createReportContent({ contentReportRepo }),
  getWalkAlbum: createGetWalkAlbum({ walkAlbumRepo, feedRepo }),
  addPostTags: createAddPostTags({ feedRepo }),
  removePostTag: createRemovePostTag({ feedRepo }),
  addContentReaction: createAddContentReaction({ feedRepo }),
  removeContentReaction: createRemoveContentReaction({ feedRepo }),
  searchByHashtag: createSearchByHashtag({ feedRepo }),
  getTrendingHashtags: createGetTrendingHashtags({ feedRepo, redis }),
};

export const contentModerationDeps = {
  getPendingReports: createGetPendingReports({ contentReportRepo }),
  reviewContentReport: createReviewContentReport({ contentReportRepo }),
};
