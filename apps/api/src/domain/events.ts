import { logger } from '@pawmeet/utils';

// ── Domain event types ─────────────────────────────────────────────────────────

export const DOMAIN_EVENT = {
  MESSAGE_SENT: 'message.sent',
  GROUP_MESSAGE_SENT: 'group_message.sent',
  SUPPORT_TICKET_CREATED: 'support_ticket.created',
  SUPPORT_REPLY_SENT: 'support_reply.sent',
  SUPPORT_MESSAGE_SENT: 'support_message.sent',
} as const;

export type DomainEventType = (typeof DOMAIN_EVENT)[keyof typeof DOMAIN_EVENT];

// ── Event payloads ─────────────────────────────────────────────────────────────

export interface DomainEvent {
  type: DomainEventType;
  payload: Record<string, unknown>;
  timestamp: Date;
}

// ── In-process pub/sub ─────────────────────────────────────────────────────────

type EventHandler = (event: DomainEvent) => Promise<void>;

const handlers = new Map<string, EventHandler[]>();

/** Register a handler for a specific event type. */
export function on(type: DomainEventType, handler: EventHandler): void {
  const list = handlers.get(type) ?? [];
  list.push(handler);
  handlers.set(type, list);
}

/**
 * Emit a domain event to all registered handlers.
 * Uses Promise.allSettled so a failing handler never blocks the use case.
 */
export async function emit(event: DomainEvent): Promise<void> {
  const list = handlers.get(event.type) ?? [];
  if (list.length === 0) return;

  const results = await Promise.allSettled(list.map((h) => h(event)));
  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error('DomainEvents', `Handler failed for ${event.type}`, result.reason);
    }
  }
}

/** Remove all handlers (useful for tests). */
export function clearHandlers(): void {
  handlers.clear();
}
