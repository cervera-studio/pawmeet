// ── Admin WebSocket event types (backoffice real-time moderation) ─────────────

export const ADMIN_WS_EVENT = {
  MODERATION_NEW_PHOTO: 'moderation_new_photo',
  MODERATION_NEW_REPORT: 'moderation_new_report',
  MODERATION_NEW_POST: 'moderation_new_post',
  MODERATION_NEW_STORY: 'moderation_new_story',
  MODERATION_NEW_CONTENT_REPORT: 'moderation_new_content_report',
  MODERATION_NEW_CHAT_REPORT: 'moderation_new_chat_report',
  MODERATION_ITEM_ACTIONED: 'moderation_item_actioned',
  ADMIN_ERROR: 'admin_error',
} as const;

export type AdminWsEvent = (typeof ADMIN_WS_EVENT)[keyof typeof ADMIN_WS_EVENT];

export type ModerationQueue = 'photos' | 'reports' | 'feed' | 'stories' | 'content' | 'chat';

export type ModerationAction =
  | 'approved'
  | 'rejected'
  | 'approved_all'
  | 'deleted'
  | 'dismiss'
  | 'warn'
  | 'suspend'
  | 'ban'
  | 'dismissed'
  | 'reviewed';

export type AdminWsMessage =
  | { type: typeof ADMIN_WS_EVENT.MODERATION_NEW_PHOTO; payload: { photoId: string } }
  | { type: typeof ADMIN_WS_EVENT.MODERATION_NEW_REPORT; payload: { reportId: string } }
  | { type: typeof ADMIN_WS_EVENT.MODERATION_NEW_POST; payload: { postId: string } }
  | { type: typeof ADMIN_WS_EVENT.MODERATION_NEW_STORY; payload: { storyId: string } }
  | {
      type: typeof ADMIN_WS_EVENT.MODERATION_NEW_CONTENT_REPORT;
      payload: { reportId: string; contentType: string };
    }
  | { type: typeof ADMIN_WS_EVENT.MODERATION_NEW_CHAT_REPORT; payload: { reportId: string } }
  | {
      type: typeof ADMIN_WS_EVENT.MODERATION_ITEM_ACTIONED;
      payload: {
        queue: ModerationQueue;
        itemId: string;
        action: ModerationAction;
        adminId: string;
      };
    }
  | { type: typeof ADMIN_WS_EVENT.ADMIN_ERROR; payload: { error: string } };
