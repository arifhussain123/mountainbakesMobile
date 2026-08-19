/**
 * Retry backoff for the sync queue.
 *
 * Fixed schedule rather than pure exponential, so the tail is bounded and
 * predictable: a transaction that fails all night retries on a known cadence
 * instead of drifting into hour-long gaps.
 *
 *   attempt 1 → 2s     attempt 4 → 2m
 *   attempt 2 → 8s     attempt 5 → 10m
 *   attempt 3 → 30s    attempt 6+ → 30m (cap)
 *
 * Jitter spreads retries so four branches reconnecting on the same shop wifi do
 * not hit the API in lockstep.
 */

const SCHEDULE_MS = [2_000, 8_000, 30_000, 120_000, 600_000] as const;
export const MAX_BACKOFF_MS = 1_800_000; // 30 minutes

/**
 * Attempts before an operation is parked as `failed`.
 *
 * Parked is visible and hand-retryable — never deleted. A failed row is still
 * the only copy of a transaction the server never accepted.
 */
export const MAX_ATTEMPTS = 8;

/** Jitter as a fraction of the delay: ±20%. */
const JITTER_RATIO = 0.2;

/**
 * Delay before the next attempt. `attemptCount` is the number of attempts
 * ALREADY made (0 = never tried).
 *
 * `random` is injectable so tests can assert the schedule without flakiness.
 */
export function backoffMs(attemptCount: number, random: () => number = Math.random): number {
  const index = Math.max(0, attemptCount - 1);
  const base = index < SCHEDULE_MS.length ? SCHEDULE_MS[index]! : MAX_BACKOFF_MS;

  // random() in [0,1) → factor in [0.8, 1.2)
  const factor = 1 + (random() * 2 - 1) * JITTER_RATIO;
  return Math.round(Math.min(base * factor, MAX_BACKOFF_MS * (1 + JITTER_RATIO)));
}

/** Whether an operation has exhausted its retries and should be parked. */
export function hasExhaustedRetries(attemptCount: number): boolean {
  return attemptCount >= MAX_ATTEMPTS;
}
