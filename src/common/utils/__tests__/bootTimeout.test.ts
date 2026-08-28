/**
 * The start sequence must not be able to hang.
 *
 * Every step in `useBootstrap` can hang rather than fail — the Keychain can wait
 * on a biometric prompt that never resolves, SQLite can block on a file a killed
 * process left locked, and `bootstrapAuth` reaches a network that may accept a
 * connection and never answer. **None of those reject**, so before the watchdog
 * the splash could stay up for as long as the app was open, with force-quit as
 * the only way out. That is the specific failure this covers.
 *
 * The race itself is tested here rather than through `App.tsx` because the
 * behaviour worth pinning is "a promise that never settles becomes a rejection
 * on a deadline" — mounting the whole app to assert it would test the renderer,
 * not the rule.
 */

import { BOOT_TIMEOUT_MS, withBootTimeout } from '@/common/utils/bootTimeout';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('boot watchdog', () => {
  it('rejects a step that never settles', async () => {
    const timer: { id?: ReturnType<typeof setTimeout> } = {};
    // The exact shape of a hung Keychain read: a promise with no other outcome.
    const hung = new Promise<void>(() => {});
    const raced = withBootTimeout(hung, timer);

    jest.advanceTimersByTime(BOOT_TIMEOUT_MS);

    await expect(raced).rejects.toThrow(/taking longer/i);
  });

  /**
   * The message reaches the user, so it says what to do. "BootTimeout" or a
   * stack trace on the first screen of the app is not a diagnosis.
   */
  it('fails with plain, actionable copy', async () => {
    const timer: { id?: ReturnType<typeof setTimeout> } = {};
    const raced = withBootTimeout(new Promise<void>(() => {}), timer);
    jest.advanceTimersByTime(BOOT_TIMEOUT_MS);

    await expect(raced).rejects.toThrow(
      'Starting is taking longer than it should. Check your connection and try again.',
    );
  });

  it('lets a normal start through untouched', async () => {
    const timer: { id?: ReturnType<typeof setTimeout> } = {};
    const raced = withBootTimeout(Promise.resolve('ready'), timer);
    await expect(raced).resolves.toBe('ready');
  });

  /**
   * A slow-but-working cold start on an old device must not be killed. The
   * budget is generous on purpose: the watchdog is for hangs, not for slowness.
   */
  it('does not fire on a start that is merely slow', async () => {
    const timer: { id?: ReturnType<typeof setTimeout> } = {};
    const slow = new Promise<string>(resolve => setTimeout(() => resolve('ready'), 8_000));
    const raced = withBootTimeout(slow, timer);

    jest.advanceTimersByTime(8_000);

    await expect(raced).resolves.toBe('ready');
  });

  /**
   * A real failure must surface as itself, not be masked by the deadline — an
   * unreadable Keychain and a hang need different fixes.
   */
  it('passes a genuine failure through rather than reporting a timeout', async () => {
    const timer: { id?: ReturnType<typeof setTimeout> } = {};
    const raced = withBootTimeout(Promise.reject(new Error('Migration 007 failed')), timer);
    await expect(raced).rejects.toThrow('Migration 007 failed');
  });
});
