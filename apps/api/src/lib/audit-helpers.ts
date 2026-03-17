/**
 * Safely convert a typed object to Record<string, unknown> for audit logging.
 * Avoids `as unknown as Record<string, unknown>` casts throughout the codebase.
 */
export function toAuditChanges(obj: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj));
}
