import { logger } from '@pawmeet/utils';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

type NetworkListener = (isConnected: boolean) => void;

const listeners = new Set<NetworkListener>();
let currentState: boolean = true;
let unsubscribe: (() => void) | null = null;

/**
 * Start listening for network state changes.
 * Call once at app startup.
 */
export function startNetworkMonitor(): void {
  if (unsubscribe) return;

  unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const connected = state.isConnected ?? false;
    if (connected !== currentState) {
      currentState = connected;
      logger.info('Network', connected ? 'Online' : 'Offline');
      for (const listener of listeners) {
        listener(connected);
      }
    }
  });
}

/**
 * Stop listening for network state changes.
 */
export function stopNetworkMonitor(): void {
  unsubscribe?.();
  unsubscribe = null;
}

/**
 * Register a callback for network state changes.
 * Returns an unsubscribe function.
 */
export function onNetworkChange(listener: NetworkListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Check if the device is currently online.
 */
export function isOnline(): boolean {
  return currentState;
}

/**
 * Fetch current network state (async, authoritative).
 */
export async function fetchNetworkState(): Promise<boolean> {
  const state = await NetInfo.fetch();
  currentState = state.isConnected ?? false;
  return currentState;
}
