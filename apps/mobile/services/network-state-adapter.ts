import { isOnline } from '@/lib/network';
import type { NetworkState } from '@/repositories/interfaces';

/**
 * NetworkState implementation backed by @react-native-community/netinfo.
 * Adapts the module-level isOnline() into the NetworkState interface
 * so composite repositories don't depend on the network module directly.
 */
export function createNetworkStateAdapter(): NetworkState {
  return {
    isOnline,
  };
}
