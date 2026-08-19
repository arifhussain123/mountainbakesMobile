/**
 * The deadline on app startup.
 *
 * Every step of the start sequence can **hang** rather than fail, and a hang is
 * the one outcome with no recovery: the Keychain can wait on a biometric prompt
 * that never resolves, SQLite can block on a file a killed process left locked,
 * and session restore reaches Supabase over a network that may accept a
 * connection and then never answer. None of those reject, so without a deadline
 * the splash stays up for as long as the app is open and force-quit is the only
 * way out.
 *
 * This lives in its own module rather than inside `App.tsx` so the rule can be
 * tested directly. A test that re-declared the race would be testing a copy, and
 * the copy would go on passing after the real one changed.
 */

/**
 * Twelve seconds: well past a slow-but-working cold start on an old device, well
 * short of the point where someone decides the app is broken.
 *
 * The watchdog is for hangs, not for slowness — a start that is merely slow must
 * be allowed to finish.
 */
export const BOOT_TIMEOUT_MS = 12_000;

export class BootTimeout extends Error {
  constructor() {
    // Reaches the user on the failure screen, so it says what to do. A stack
    // trace on the first screen of the app is not a diagnosis.
    super('Starting is taking longer than it should. Check your connection and try again.');
    this.name = 'BootTimeout';
  }
}

/**
 * Rejects with `BootTimeout` if `work` has not settled within the budget.
 *
 * It does **not** cancel `work` — none of the init steps is cancellable — so a
 * late-resolving step may still finish in the background. That is harmless: each
 * one is idempotent, the caller's `cancelled` flag stops a stale state write,
 * and retrying re-runs the sequence from the top.
 *
 * A genuine rejection passes straight through. An unreadable Keychain and a hang
 * need different fixes, so they must not arrive as the same error.
 *
 * `timer` is an out-param so the caller can `clearTimeout` on unmount; a pending
 * timer would otherwise keep a handle alive and reject into nothing.
 */
export function withBootTimeout<T>(
  work: Promise<T>,
  timer: { id?: ReturnType<typeof setTimeout> },
): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) => {
      timer.id = setTimeout(() => reject(new BootTimeout()), BOOT_TIMEOUT_MS);
    }),
  ]);
}
