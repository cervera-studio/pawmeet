/**
 * Recursively converts Date fields to string in a type.
 * Mirrors tRPC/JSON serialization (Date → ISO 8601 string)
 * without depending on tRPC's RouterOutput.
 *
 * Use this in repository interfaces so hooks/view-models
 * stay transport-agnostic.
 *
 * @example
 * ```ts
 * import type { Walk } from '@dogwalk/types';
 * import type { Serialized } from '@dogwalk/types';
 *
 * interface WalkRepository {
 *   listUpcoming(): Promise<Serialized<Walk>[]>;
 * }
 * ```
 */
export type Serialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;
