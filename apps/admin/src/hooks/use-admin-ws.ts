'use client';

import process from 'node:process';
import type { AdminWsMessage } from '@pawmeet/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/lib/auth-store';

/** WebSocket close codes that indicate auth failure */
const AUTH_CLOSE_CODES = new Set([1008, 4001, 4003]);

/** Exponential backoff bounds */
const MIN_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30_000;

type AdminWsListener = (message: AdminWsMessage) => void;

interface UseAdminWsReturn {
  isConnected: boolean;
}

const listeners = new Set<AdminWsListener>();
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = MIN_RECONNECT_DELAY;
let refCount = 0;

function getWsUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
  const host = apiUrl.replace(/^https?:\/\//, '');
  return `${wsProtocol}://${host}/ws/admin`;
}

function connect() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return;
  }

  const token = getAccessToken();
  if (!token) return;

  const url = getWsUrl();

  try {
    ws = new WebSocket(url, [`access_token.${token}`]);
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    reconnectDelay = MIN_RECONNECT_DELAY;
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data as string) as AdminWsMessage;
      for (const listener of listeners) {
        listener(message);
      }
    } catch {
      // Ignore malformed messages
    }
  };

  ws.onclose = (event) => {
    ws = null;

    if (AUTH_CLOSE_CODES.has(event.code)) {
      scheduleReconnect();
      return;
    }

    if (refCount > 0) {
      scheduleReconnect();
    }
  };

  ws.onerror = () => {
    // onclose will fire after onerror
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
  }, reconnectDelay);
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  reconnectDelay = MIN_RECONNECT_DELAY;
}

/**
 * Subscribe to admin WebSocket events.
 * Manages a singleton connection shared across all consumers.
 */
export function useAdminWs(onMessage?: AdminWsListener): UseAdminWsReturn {
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  const wrappedListener = useCallback((msg: AdminWsMessage) => {
    callbackRef.current?.(msg);
  }, []);

  useEffect(() => {
    listeners.add(wrappedListener);
    refCount++;

    connect();

    // Track connection state
    const interval = setInterval(() => {
      setIsConnected(ws?.readyState === WebSocket.OPEN);
    }, 1000);

    return () => {
      listeners.delete(wrappedListener);
      refCount--;
      clearInterval(interval);

      if (refCount <= 0) {
        refCount = 0;
        disconnect();
      }
    };
  }, [wrappedListener]);

  return { isConnected };
}
