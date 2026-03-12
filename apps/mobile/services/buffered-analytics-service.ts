import { ANALYTICS_BATCH_MAX_EVENTS, ANALYTICS_FLUSH_INTERVAL_MS } from '@pawmeet/config';
import type { AnalyticsEventMap, AnalyticsEventName, AnalyticsService } from '@pawmeet/types';
import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';
import { useAuthStore } from '@/stores/auth';
import { useConsentStore } from '@/stores/consent';

interface BufferedEvent {
  clientEventId: string;
  eventName: string;
  properties: Record<string, unknown>;
  clientTimestamp: string;
  platform: 'ios' | 'android';
  appVersion?: string;
  screenName?: string;
  sessionId?: string;
}

/**
 * Buffers analytics events in memory and flushes to POST /api/events/batch.
 *
 * Flush triggers:
 * - Buffer reaches ANALYTICS_BATCH_MAX_EVENTS
 * - Timer fires every ANALYTICS_FLUSH_INTERVAL_MS
 * - App comes to foreground
 * - Manual flush() call
 */
export function createBufferedAnalyticsService(apiUrl: string): AnalyticsService {
  const buffer: BufferedEvent[] = [];
  let enabled = false;
  let sessionId: string | null = null;
  let flushTimer: ReturnType<typeof setInterval> | null = null;

  function startTimer() {
    if (flushTimer) return;
    flushTimer = setInterval(() => {
      doFlush();
    }, ANALYTICS_FLUSH_INTERVAL_MS);
  }

  function stopTimer() {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
  }

  // Flush on app foreground
  AppState.addEventListener('change', (state) => {
    if (state === 'active' && enabled) {
      doFlush();
    }
  });

  async function doFlush() {
    if (buffer.length === 0) return;

    const batch = buffer.splice(0, ANALYTICS_BATCH_MAX_EVENTS);
    const token = useAuthStore.getState().token;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${apiUrl}/api/events/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ events: batch, consentGiven: true }),
      });

      if (!res.ok) {
        // Put events back at the front of the buffer for retry
        buffer.unshift(...batch);
      }
    } catch {
      // Network error — put events back for retry
      buffer.unshift(...batch);
    }
  }

  return {
    identify(_userId: string) {
      sessionId = Crypto.randomUUID();
    },

    track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]) {
      if (!enabled) return;

      // Check analytics consent
      const hasConsent = useConsentStore.getState().consents.analytics;
      if (!hasConsent) return;

      const entry: BufferedEvent = {
        clientEventId: Crypto.randomUUID(),
        eventName: event,
        properties: properties as Record<string, unknown>,
        clientTimestamp: new Date().toISOString(),
        platform: 'ios', // TODO: detect from Platform.OS
        sessionId: sessionId ?? undefined,
      };

      buffer.push(entry);

      if (buffer.length >= ANALYTICS_BATCH_MAX_EVENTS) {
        doFlush();
      }
    },

    reset() {
      sessionId = null;
      buffer.length = 0;
    },

    optIn() {
      enabled = true;
      startTimer();
    },

    optOut() {
      enabled = false;
      stopTimer();
      buffer.length = 0;
    },

    async flush() {
      await doFlush();
    },
  };
}
