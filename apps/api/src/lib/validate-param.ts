import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extract a path parameter and validate it as UUID. Throws 400 if invalid. */
export function uuidParamOrBail(c: Context, name: string): string {
  const value = c.req.param(name);
  if (!value || !UUID_RE.test(value)) {
    throw new HTTPException(400, { message: `Parametro '${name}' non è un UUID valido` });
  }
  return value;
}
