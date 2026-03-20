import type { ChatMessage, SupportMessage } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';

// ── Domain event types ─────────────────────────────────────────────────────────

export const DOMAIN_EVENT = {
  MESSAGE_SENT: 'message.sent',
  GROUP_MESSAGE_SENT: 'group_message.sent',
  SUPPORT_TICKET_CREATED: 'support_ticket.created',
  SUPPORT_REPLY_SENT: 'support_reply.sent',
  SUPPORT_MESSAGE_SENT: 'support_message.sent',
  MATCH_CREATED: 'match.created',
  GROUP_EVENT_JOINED: 'group_event.joined',
  GROUP_EVENT_CANCELLED: 'group_event.cancelled',
  WALK_COMPLETED: 'walk.completed',
} as const;

// ── Typed domain events (discriminated union) ─────────────────────────────────

export type DomainEvent =
  | {
      type: typeof DOMAIN_EVENT.MESSAGE_SENT;
      payload: {
        messageId: string;
        matchId: string;
        senderId: string;
        recipientId: string | null;
        message: ChatMessage;
        content: string;
        sanitizedContent: string;
      };
      timestamp: Date;
    }
  | {
      type: typeof DOMAIN_EVENT.GROUP_MESSAGE_SENT;
      payload: {
        eventId: string;
        senderId: string;
        message: unknown;
        participantIds: string[];
        content: string;
      };
      timestamp: Date;
    }
  | {
      type: typeof DOMAIN_EVENT.SUPPORT_TICKET_CREATED;
      payload: { ticketId: string; userId: string };
      timestamp: Date;
    }
  | {
      type: typeof DOMAIN_EVENT.SUPPORT_REPLY_SENT;
      payload: {
        ticketId: string;
        userId: string | null;
        message: SupportMessage;
        isInternal: boolean;
        sanitizedContent: string;
      };
      timestamp: Date;
    }
  | {
      type: typeof DOMAIN_EVENT.SUPPORT_MESSAGE_SENT;
      payload: { ticketId: string; userId: string; message: SupportMessage };
      timestamp: Date;
    }
  | {
      type: typeof DOMAIN_EVENT.MATCH_CREATED;
      payload: {
        matchId: string;
        userId: string;
        compatibilityScore: number;
        distanceKm?: number;
        sizePair?: string;
        energyPair?: string;
      };
      timestamp: Date;
    }
  | {
      type: typeof DOMAIN_EVENT.GROUP_EVENT_JOINED;
      payload: {
        eventId: string;
        userId: string;
        participantNumber: number;
      };
      timestamp: Date;
    }
  | {
      type: typeof DOMAIN_EVENT.GROUP_EVENT_CANCELLED;
      payload: {
        eventId: string;
        userId: string;
        eventTitle: string;
        participantUserIds: string[];
      };
      timestamp: Date;
    }
  | {
      type: typeof DOMAIN_EVENT.WALK_COMPLETED;
      payload: {
        trackId: string;
        userId: string;
        distanceKm: number;
        durationMinutes: number;
      };
      timestamp: Date;
    };

// ── In-process pub/sub ─────────────────────────────────────────────────────────

type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void>;

const handlers = new Map<string, EventHandler<DomainEvent>[]>();

/** Register a handler for a specific event type. */
export function on<T extends DomainEvent['type']>(
  type: T,
  handler: (event: Extract<DomainEvent, { type: T }>) => Promise<void>,
): void {
  const list = handlers.get(type) ?? [];
  list.push(handler as EventHandler<DomainEvent>);
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
