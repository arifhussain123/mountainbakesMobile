/* eslint-disable no-console */

/**
 * Central logging point (architecture skill Section 12: "log errors... include
 * context"). A thin wrapper today so every call site can be redirected to a
 * crash-reporting service later without touching every file that logs.
 */
export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (__DEV__) console.log(`[debug] ${message}`, context ?? '');
  },
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[warn] ${message}`, context ?? '');
  },
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    console.error(`[error] ${message}`, error, context ?? '');
  },
};
