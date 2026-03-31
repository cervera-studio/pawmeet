export interface NotificationPrefs {
  matches: boolean; // New match notifications
  messages: boolean; // New message notifications
  reminders: boolean; // Walk reminders
  feed: boolean; // Likes and comments on your posts
  nearby: boolean; // Nearby compatible user suggestions
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  matches: true,
  messages: true,
  reminders: true,
  feed: true,
  nearby: true,
};

export interface User {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string | null;
  authProvider: 'email' | 'google' | 'apple';
  avatarUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: Date | null;
  searchRadiusKm: number;
  emailVerified: boolean;
  locale: string;
  pushToken: string | null;
  notificationPrefs: NotificationPrefs;
  isActive: boolean;
  deletionScheduledAt: Date | null;
  dateOfBirth: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  followersCount: number;
  followingCount: number;
  termsAcceptedAt: Date | null;
  privacyPolicyVersion: string | null;
  onboardingCompletedAt: Date | null;
}

/** User data without sensitive fields (passwordHash, pushToken). */
export type SafeUser = Omit<User, 'passwordHash' | 'pushToken'>;
