/** Refresh token TTL: 7 days (used by mobile + passkey login) */
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Maximum failed login/OTP attempts before lockout */
export const MAX_FAILED_ATTEMPTS = 5;

/** User login lockout duration: 15 minutes */
export const USER_LOCKOUT_DURATION_SECONDS = 15 * 60;

/** Admin login lockout duration: 30 minutes (stricter for elevated privileges) */
export const ADMIN_LOCKOUT_DURATION_SECONDS = 30 * 60;

/** Email verification OTP expiry: 5 minutes */
export const EMAIL_VERIFICATION_OTP_EXPIRY_MS = 5 * 60 * 1000;

/** Password reset OTP expiry: 5 minutes */
export const PASSWORD_RESET_OTP_EXPIRY_MS = 5 * 60 * 1000;

/** Per-email OTP attempt window: 15 minutes */
export const OTP_WINDOW_SECONDS = 15 * 60;

/** Maximum OTP verification attempts per window */
export const MAX_OTP_ATTEMPTS = 5;

/** Admin refresh cookie max age: 8 hours */
export const ADMIN_REFRESH_COOKIE_MAX_AGE = 8 * 60 * 60;

// ── Redis key prefixes ────────────────────────────────────────────────────────

export const REDIS_PREFIX_USER_FAILED_ATTEMPTS = 'auth:failed:';
export const REDIS_PREFIX_ADMIN_FAILED_ATTEMPTS = 'admin:login:failed:';
export const REDIS_PREFIX_ADMIN_LOCKOUT = 'admin:login:locked:';
export const REDIS_PREFIX_ADMIN_RESET_OTP = 'admin:reset-otp:';
export const REDIS_PREFIX_OTP_ATTEMPTS = 'otp:attempts:';
