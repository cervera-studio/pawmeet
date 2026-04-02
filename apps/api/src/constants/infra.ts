/** Heartbeat ping interval for WebSocket connections (ms) */
export const HEARTBEAT_INTERVAL_MS = 30_000;

/** Max concurrent WebSocket connections per user */
export const MAX_CONCURRENT_USER_CONNECTIONS = 5;

/** Max concurrent admin WebSocket connections per admin */
export const MAX_CONCURRENT_ADMIN_CONNECTIONS = 2;

/** TTL for cached ticket ownership lookups (ms) */
export const TICKET_OWNER_TTL_MS = 30_000;
