/* eslint-disable no-console -- logger is the single place where console is used intentionally */
declare const console: {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

const LOG_LEVEL = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 } as const;

type Level = keyof typeof LOG_LEVEL;

type ErrorHook = (tag: string, msg: string, data?: unknown) => void;

let minLevel: Level = 'info';
let errorHook: ErrorHook | null = null;

export const logger = {
  setLevel(level: Level) {
    minLevel = level;
  },

  getLevel(): Level {
    return minLevel;
  },

  /** Register a hook called on every warn/error log (e.g. Sentry.captureException). */
  onError(hook: ErrorHook) {
    errorHook = hook;
  },

  debug(tag: string, msg: string, data?: unknown) {
    if (LOG_LEVEL[minLevel] <= LOG_LEVEL.debug)
      console.debug(`[${tag}]`, msg, ...(data === undefined ? [] : [data]));
  },

  info(tag: string, msg: string, data?: unknown) {
    if (LOG_LEVEL[minLevel] <= LOG_LEVEL.info)
      console.info(`[${tag}]`, msg, ...(data === undefined ? [] : [data]));
  },

  warn(tag: string, msg: string, data?: unknown) {
    if (LOG_LEVEL[minLevel] <= LOG_LEVEL.warn)
      console.warn(`[${tag}]`, msg, ...(data === undefined ? [] : [data]));
    errorHook?.(tag, msg, data);
  },

  error(tag: string, msg: string, data?: unknown) {
    if (LOG_LEVEL[minLevel] <= LOG_LEVEL.error)
      console.error(`[${tag}]`, msg, ...(data === undefined ? [] : [data]));
    errorHook?.(tag, msg, data);
  },
};
