import process from 'node:process';
import type { WsMessage } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '@/stores/auth';

function getWsUrl(): string {
  const url = process.env.EXPO_PUBLIC_WS_URL;
  if (!(url || __DEV__)) {
    throw new Error('EXPO_PUBLIC_WS_URL is required in production');
  }
  return url ?? 'ws://localhost:3000/ws';
}

const WS_URL = getWsUrl();

type WsListener = (message: WsMessage) => void;

const listeners = new Set<WsListener>();
let sharedWs: WebSocket | null = null;
let sharedToken: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
const MAX_RECONNECT_DELAY = 30_000;
const BASE_DELAY = 1000;

function getReconnectDelay(): number {
  const delay = Math.min(BASE_DELAY * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY);
  // Add jitter (±25%)
  return delay * (0.75 + Math.random() * 0.5);
}

function connect(token: string) {
  if (sharedWs?.readyState === WebSocket.OPEN || sharedWs?.readyState === WebSocket.CONNECTING) {
    return;
  }

  sharedToken = token;
  const ws = new WebSocket(WS_URL);
  sharedWs = ws;

  ws.onopen = () => {
    // Send auth token as first message instead of exposing it in the subprotocol/URL
    ws.send(JSON.stringify({ type: 'auth', payload: { token } }));
    reconnectAttempt = 0;
    logger.debug('useWebSocket', 'Connected');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as WsMessage;
      for (const listener of listeners) {
        listener(data);
      }
    } catch (e) {
      logger.debug('useWebSocket', 'Malformed WS message', e);
    }
  };

  ws.onerror = (e) => {
    logger.debug('useWebSocket', 'WS error', e);
  };

  ws.onclose = () => {
    sharedWs = null;
    if (sharedToken && listeners.size > 0) {
      scheduleReconnect();
    }
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = getReconnectDelay();
  reconnectAttempt++;
  logger.debug(
    'useWebSocket',
    `Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempt})`,
  );
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (sharedToken && listeners.size > 0) {
      connect(sharedToken);
    }
  }, delay);
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempt = 0;
  sharedToken = null;
  if (sharedWs) {
    sharedWs.close();
    sharedWs = null;
  }
}

/**
 * Returns the shared WebSocket instance for sending messages.
 * All features (chat, feed) share this single connection.
 */
export function getSharedWs(): WebSocket | null {
  return sharedWs;
}

/**
 * Subscribe to all incoming WebSocket messages.
 * The connection is opened lazily when the first listener subscribes.
 * Reconnects automatically with exponential backoff.
 */
export function useWebSocketListener(listener: WsListener) {
  const token = useAuthStore((s) => s.token);
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    const wrappedListener: WsListener = (msg) => listenerRef.current(msg);
    listeners.add(wrappedListener);

    if (token) {
      connect(token);
    }

    return () => {
      listeners.delete(wrappedListener);
      if (listeners.size === 0) {
        disconnect();
      }
    };
  }, [token]);
}

/**
 * Manages the shared WebSocket lifecycle — call once at app root.
 * Handles reconnect on app foreground and disconnect on logout.
 */
export function useWebSocketManager() {
  const token = useAuthStore((s) => s.token);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      disconnect();
      setConnected(false);
      return;
    }

    connect(token);

    // Reconnect when app comes to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && token && (!sharedWs || sharedWs.readyState !== WebSocket.OPEN)) {
        reconnectAttempt = 0;
        connect(token);
      }
    });

    // Track connected state
    const interval = setInterval(() => {
      setConnected(sharedWs?.readyState === WebSocket.OPEN);
    }, 1000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [token]);

  return { connected };
}
