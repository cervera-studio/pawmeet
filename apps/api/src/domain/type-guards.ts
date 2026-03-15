/**
 * Type guard that narrows nullable latitude/longitude fields to non-null.
 * Works with any object shape that has `latitude: number | null` and `longitude: number | null`.
 */
export function hasLocation<T extends { latitude: number | null; longitude: number | null }>(
  entity: T,
): entity is T & { latitude: number; longitude: number } {
  return entity.latitude !== null && entity.longitude !== null;
}

/**
 * Type guard for objects using ownerLat/ownerLon naming (e.g. CandidateDog).
 */
export function hasOwnerLocation<T extends { ownerLat: number | null; ownerLon: number | null }>(
  entity: T,
): entity is T & { ownerLat: number; ownerLon: number } {
  return entity.ownerLat !== null && entity.ownerLon !== null;
}
