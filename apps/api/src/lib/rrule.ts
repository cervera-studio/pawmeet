/**
 * Re-export RRule with ESM/CJS compatibility.
 *
 * The `rrule` package exports differently under tsx (CJS compat)
 * vs esbuild (pure ESM). This wrapper normalises the import so
 * consumers can simply `import { RRule } from '../lib/rrule.js'`.
 */
import * as rruleLib from 'rrule';

const resolved = 'default' in rruleLib ? (rruleLib.default as typeof rruleLib) : rruleLib;

export const RRule = resolved.RRule;
