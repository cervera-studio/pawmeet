import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DomainEvent } from './events.js';
import { clearHandlers, DOMAIN_EVENT, emit, on } from './events.js';

afterEach(() => {
  clearHandlers();
});

describe('DOMAIN_EVENT', () => {
  it('contains expected event types', () => {
    expect(DOMAIN_EVENT.MESSAGE_SENT).toBe('message.sent');
    expect(DOMAIN_EVENT.MATCH_CREATED).toBe('match.created');
    expect(DOMAIN_EVENT.WALK_COMPLETED).toBe('walk.completed');
    expect(DOMAIN_EVENT.GROUP_EVENT_JOINED).toBe('group_event.joined');
    expect(DOMAIN_EVENT.GROUP_EVENT_CANCELLED).toBe('group_event.cancelled');
  });
});

describe('on / emit', () => {
  it('delivers event to registered handler', async () => {
    const handler = vi.fn<(event: DomainEvent) => Promise<void>>().mockResolvedValue(undefined);
    on(DOMAIN_EVENT.MATCH_CREATED, handler);

    const event = {
      type: DOMAIN_EVENT.MATCH_CREATED,
      payload: { matchId: 'm-1', userId: 'u-1', compatibilityScore: 0.85 },
      timestamp: new Date(),
    } satisfies DomainEvent;

    await emit(event);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('delivers event to multiple handlers', async () => {
    const h1 = vi.fn<(event: DomainEvent) => Promise<void>>().mockResolvedValue(undefined);
    const h2 = vi.fn<(event: DomainEvent) => Promise<void>>().mockResolvedValue(undefined);
    on(DOMAIN_EVENT.MATCH_CREATED, h1);
    on(DOMAIN_EVENT.MATCH_CREATED, h2);

    const event = {
      type: DOMAIN_EVENT.MATCH_CREATED,
      payload: { matchId: 'm-1', userId: 'u-1', compatibilityScore: 0.85 },
      timestamp: new Date(),
    } satisfies DomainEvent;

    await emit(event);
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('does not call handlers for other event types', async () => {
    const handler = vi.fn<(event: DomainEvent) => Promise<void>>().mockResolvedValue(undefined);
    on(DOMAIN_EVENT.MATCH_CREATED, handler);

    const event = {
      type: DOMAIN_EVENT.WALK_COMPLETED,
      payload: { trackId: 't-1', userId: 'u-1', distanceKm: 2.5, durationMinutes: 30 },
      timestamp: new Date(),
    } satisfies DomainEvent;

    await emit(event);
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not throw when a handler rejects', async () => {
    on(DOMAIN_EVENT.MATCH_CREATED, () => Promise.reject(new Error('handler error')));

    const event = {
      type: DOMAIN_EVENT.MATCH_CREATED,
      payload: { matchId: 'm-1', userId: 'u-1', compatibilityScore: 0.85 },
      timestamp: new Date(),
    } satisfies DomainEvent;

    await expect(emit(event)).resolves.toBeUndefined();
  });

  it('continues calling other handlers when one rejects', async () => {
    const h2 = vi.fn<(event: DomainEvent) => Promise<void>>().mockResolvedValue(undefined);
    on(DOMAIN_EVENT.MATCH_CREATED, () => Promise.reject(new Error('boom')));
    on(DOMAIN_EVENT.MATCH_CREATED, h2);

    const event = {
      type: DOMAIN_EVENT.MATCH_CREATED,
      payload: { matchId: 'm-1', userId: 'u-1', compatibilityScore: 0.85 },
      timestamp: new Date(),
    } satisfies DomainEvent;

    await emit(event);
    expect(h2).toHaveBeenCalledOnce();
  });
});

describe('clearHandlers', () => {
  it('removes all handlers', async () => {
    const handler = vi.fn<(event: DomainEvent) => Promise<void>>().mockResolvedValue(undefined);
    on(DOMAIN_EVENT.MATCH_CREATED, handler);
    clearHandlers();

    const event = {
      type: DOMAIN_EVENT.MATCH_CREATED,
      payload: { matchId: 'm-1', userId: 'u-1', compatibilityScore: 0.85 },
      timestamp: new Date(),
    } satisfies DomainEvent;

    await emit(event);
    expect(handler).not.toHaveBeenCalled();
  });
});
