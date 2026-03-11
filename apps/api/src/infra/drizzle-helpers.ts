/**
 * Safely extract the first row from a Drizzle query result.
 * Drizzle returns `Record<string, unknown>` from `.select()`, so a cast to
 * the domain type is unavoidable.  This helper centralises that cast and
 * makes the `rows[0]` access explicit.
 */
export function firstRow<T>(rows: unknown[]): T {
  return rows[0] as T;
}

export function firstRowOrNull<T>(rows: unknown[]): T | null {
  return (rows[0] as T | undefined) ?? null;
}

export function rowsAs<T>(rows: unknown[]): T[] {
  return rows as T[];
}
