/**
 * Tiny dev-only logger (WS7 / H-11).
 *
 * Routes non-essential, dev/ops noise (DB init/reset/seed/migration chatter,
 * cache-clear confirmations, session-set debugging) behind a `__DEV__` gate so
 * production builds stay quiet. Uses the same signatures as `console`, so a
 * dev-only call is a one-line swap and real error paths are never affected.
 *
 * IMPORTANT: do NOT route the essential error surface through this logger —
 * ApiError paths (mangaAPI), funnel/instrumentation failures, and user-facing
 * catch handlers (`console.error('… failed', e)`) must keep their console
 * output in all builds.
 */
const enabled = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

export const log = {
  log: (...args: unknown[]) => { if (enabled) console.log(...args); },
  warn: (...args: unknown[]) => { if (enabled) console.warn(...args); },
  info: (...args: unknown[]) => { if (enabled) console.info(...args); },
  debug: (...args: unknown[]) => { if (enabled) console.debug(...args); },
  error: (...args: unknown[]) => { if (enabled) console.error(...args); },
};

export default log;