/**
 * Centralized English error messages for AppError instances.
 * Clients use the error CODE to display localized UI text.
 * These messages are for debugging and API responses only.
 */
export const ERROR_MESSAGES = {
  // ── Auth ────────────────────────────────────────────────────────────────────
  AUTH_RATE_LIMITED: 'Too many attempts, please try again later',
  AUTH_EMAIL_TAKEN: 'Registration failed. Try again or sign in.',
  AUTH_UNDERAGE: (minAge: number) => `You must be at least ${minAge} years old to register.`,
  AUTH_ACCOUNT_DISABLED: 'Account disabled',
  AUTH_ACCOUNT_LOCKED: 'Account temporarily locked. Try again later.',
  AUTH_INVALID_CREDENTIALS: 'Invalid credentials',
  AUTH_INVALID_TOKEN: 'Invalid token',
  AUTH_TOKEN_EXPIRED: 'Token expired',
  INVALID_PASSWORD: 'Invalid password',

  // ── Location ────────────────────────────────────────────────────────────────
  LOCATION_NOT_SET: 'Location not set',
  LOCATION_NOT_SET_WITH_ACTION: 'Location not set. Please update your location.',
  SUSPICIOUS_LOCATION: 'Suspicious location update',

  // ── Matching / Swipe ────────────────────────────────────────────────────────
  ALREADY_SWIPED: 'Already swiped on this profile',
  SWIPE_LIMIT_REACHED: 'Daily swipe limit reached',

  // ── Walks ───────────────────────────────────────────────────────────────────
  WALK_INVALID_DATE: 'Date must be in the future',
  WALK_NOT_PENDING: 'Walk is no longer pending',
  WALK_NOT_ACTIVE: 'Walk is not active',
  WALK_NOT_COMPLETED: 'Walk is not yet completed',
  WALK_CANNOT_RESPOND_OWN: 'Cannot respond to your own proposal',
  WALK_CANNOT_CANCEL: 'Walk cannot be cancelled',

  // ── Walk Tracks ─────────────────────────────────────────────────────────────
  TRACK_NOT_OWNED: 'Not authorized for this walk track',
  TRACK_NOT_COMPLETED: 'Walk track is not yet completed',
  TRACK_ALREADY_COMPLETED: 'Walk track is already completed',

  // ── Feed / Posts ────────────────────────────────────────────────────────────
  TAG_REMOVE_FORBIDDEN: 'Not authorized to remove this tag',
  POST_ALREADY_DELETED: 'Post has already been deleted',
  POST_DELETED: 'Post has been deleted',
  COMMENT_ALREADY_DELETED: 'Comment has already been deleted',
  COMMENT_TOO_LONG: (maxLength: number) => `Comment cannot exceed ${maxLength} characters`,
  NESTING_TOO_DEEP: 'Cannot reply to a reply',
  INVALID_TAGS: 'Each tag must reference a user or a dog',
  TAG_NOT_CONNECTED: 'You can only tag users you have a match with',
  REACTION_ALREADY_EXISTS: 'Reaction already exists',

  // ── Stories ─────────────────────────────────────────────────────────────────
  STORY_EXPIRED: 'Story has expired',
  STORY_LIMIT_REACHED: (maxPerDay: number) => `You can post at most ${maxPerDay} stories per day`,
  FILE_TOO_LARGE: 'File exceeds maximum allowed size',

  // ── Social ──────────────────────────────────────────────────────────────────
  SELF_FOLLOW: 'Cannot follow yourself',
  SELF_UNFOLLOW: 'Cannot unfollow yourself',
  SELF_BLOCK: 'Cannot block yourself',
  ALREADY_FOLLOWING: 'Already following this user',
  NOT_FOLLOWING: 'Not following this user',
  ALREADY_BLOCKED: 'User already blocked',
  NOT_BLOCKED: 'User not blocked',
  OPERATION_NOT_ALLOWED: 'Operation not allowed',
  NOT_PARTICIPANT_CONVERSATION: 'Not a participant in this conversation',

  // ── Group Events ────────────────────────────────────────────────────────────
  EVENT_CANCEL_INVALID_STATUS: (status: string) => `Cannot cancel an event with status "${status}"`,
  EVENT_INVALID_DATE: 'Date must be in the future',
  EVENT_MIN_PARTICIPANTS: 'Minimum 2 participants for a group event',
  EVENT_NOT_SCHEDULED: 'Event is no longer open for invitations',
  EVENT_NOT_COMPLETED: 'Event has not ended yet',
  ALREADY_PARTICIPANT: 'User is already a participant',
  ALREADY_JOINED_EVENT: 'Already joined this event',
  EVENT_FULL: 'Event has reached maximum capacity',
  NO_ACTIVE_DOG: 'User has no active dogs',
  NO_PENDING_REQUEST: 'No pending request for this user',
  NO_PENDING_REQUEST_TO_CANCEL: 'No pending request to cancel',
  NOT_PARTICIPANT: 'Not a participant in this event',
  NOT_OFFICIAL_EVENT: 'Event is not an official event',
  SEND_GROUP_MESSAGE_NOT_PARTICIPANT: 'Not a participant in this event',

  // ── Mood Log ────────────────────────────────────────────────────────────────
  MOOD_LOG_ALREADY_SUBMITTED: 'Mood already logged for this walk',

  // ── User / Account ──────────────────────────────────────────────────────────
  ALREADY_ACTIVE: 'Account is already active',
  GRACE_PERIOD_EXPIRED: 'Grace period has expired',
  NO_AVATAR: 'No avatar to delete',
  AGE_ALREADY_VERIFIED: 'Date of birth already set',
  ALREADY_REPORTED: 'Already reported this content',

  // ── Dogs ────────────────────────────────────────────────────────────────────
  DOG_NOT_OWNED: 'Not authorized for this dog',
  DOG_LIMIT_REACHED: (max: number) => `You can register at most ${max} dogs`,

  // ── Organizations ───────────────────────────────────────────────────────────
  ORG_NOT_AUTHORIZED: 'Not authorized to manage members',
  ORG_NOT_MEMBER: 'Not a member of this organization',
  ORG_NOT_VERIFIED: 'Organization is not verified or not active',
  ORG_SLUG_TAKEN: 'This slug is already in use',
  ORG_MEMBER_EXISTS: 'User is already a member of this organization',

  // ── Passkeys ────────────────────────────────────────────────────────────────
  PASSKEY_LAST_AUTH_METHOD: 'Cannot delete your only passkey without another sign-in method',
  PASSKEY_NOT_FOUND: 'Passkey not found',
  PASSKEY_LIMIT_REACHED: 'Maximum number of passkeys reached',
  PASSKEY_CHALLENGE_EXPIRED: 'Challenge expired, please try again',
  PASSKEY_VERIFICATION_FAILED: 'Passkey verification failed',

  // ── GDPR Export ─────────────────────────────────────────────────────────────
  EXPORT_ALREADY_PENDING: 'An export is already in progress. You will receive an email when ready.',
  EXPORT_IN_PROGRESS: 'Export in progress. You will receive an email when ready.',

  // ── Walk Album ──────────────────────────────────────────────────────────────
  ALBUM_EXISTS: 'An album already exists for this walk',

  // ── Support ─────────────────────────────────────────────────────────────────
  STATUS_UNCHANGED: 'Ticket is already in this status',
  SESSION_NOT_FOUND: 'Session not found or already revoked',
  TICKET_CLOSED: 'Ticket is closed',

  // ── Feedback ────────────────────────────────────────────────────────────────
  FEEDBACK_NOT_PARTICIPANT: 'Not a participant in this walk',
  FEEDBACK_INVALID_DOG: 'Dog did not participate in this walk',
  FEEDBACK_OWN_DOG: 'Cannot rate your own dog',

  // ── Match Explanation ───────────────────────────────────────────────────────
  MATCH_FORBIDDEN: 'Not authorized',

  // ── Emergency Contacts ──────────────────────────────────────────────────────
  MAX_CONTACTS_REACHED: (max: number) => `Maximum of ${max} emergency contacts allowed`,

  // ── Push Tokens ─────────────────────────────────────────────────────────────
  PUSH_TOKEN_SAVE_FAILED: 'Failed to save push token',

  // ── MFA ─────────────────────────────────────────────────────────────────────
  MFA_NOT_CONFIGURED: 'MFA not configured',
  MFA_ALREADY_ENABLED: 'MFA is already enabled',
  MFA_NOT_ENABLED: 'MFA is not enabled',
  MFA_SETUP_REQUIRED: 'Start MFA setup first',
  MFA_INVALID_CODE: 'Invalid TOTP code',
  MFA_TOKEN_INVALID: 'MFA token invalid or expired',

  // ── Admin Auth ──────────────────────────────────────────────────────────────
  ADMIN_ACCOUNT_LOCKED: 'Account temporarily locked. Try again in 30 minutes.',
  ADMIN_INVALID_CREDENTIALS: 'Invalid credentials',
  ADMIN_TOKEN_INVALID: 'Invalid token',
  ADMIN_REFRESH_TOKEN_INVALID: 'Invalid refresh token',
  ADMIN_CSRF_FAILED: 'CSRF check failed',
  ADMIN_PASSWORD_RESET_SENT: 'If the email exists, you will receive a reset code',
  ADMIN_CODE_INVALID: 'Invalid or expired code',
  ADMIN_PASSWORD_RESET_SUCCESS: 'Password reset successfully',

  // ── General ─────────────────────────────────────────────────────────────────
  INTERNAL_ERROR: 'Internal server error',
  NOT_FOUND: 'Endpoint not found',
  INVALID_DATA: 'Invalid data',
  INVALID_EMAIL: 'Invalid email',
} as const;

/** Status labels for support tickets (used in system messages — user-facing, Italian). */
export const SUPPORT_STATUS_LABELS = {
  open: 'Aperto',
  in_progress: 'In lavorazione',
  resolved: 'Risolto',
  closed: 'Chiuso',
} as const;

/** Template for support ticket status change system message. */
export function supportStatusChangeMessage(label: string): string {
  return `Stato del ticket aggiornato a: ${label}`;
}

/** Template for support ticket email notification (user-facing, Italian). */
export const SUPPORT_TICKET_EMAIL = {
  heading: 'Aggiornamento ticket di supporto',
  ticketLabel: 'Ticket',
  subjectLabel: 'Oggetto',
  previewLabel: 'Anteprima',
  callToAction: "Accedi all'app per visualizzare la risposta completa.",
} as const;
