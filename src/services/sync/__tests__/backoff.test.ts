import { backoffMs, hasExhaustedRetries, MAX_ATTEMPTS, MAX_BACKOFF_MS } from '../backoff';

/**
 * Retry backoff.
 *
 * This decides how long a real transaction waits before it is tried again, and
 * how many tries it gets before a person has to deal with it. Both numbers are
 * business decisions rather than implementation detail: too eager and four
 * branches on one shop wifi hammer the API in lockstep; too slow and a sale rung
 * up at the counter sits unsent through a shift.
 *
 * `random` is injected throughout so the schedule can be asserted exactly. With
 * `random = 0.5` the jitter factor is exactly 1, which is what makes the table
 * below readable as the actual schedule.
 */

const noJitter = () => 0.5;

describe('the schedule', () => {
  /**
   * The documented cadence: 2s, 8s, 30s, 2m, 10m, then 30m forever. Fixed rather
   * than pure exponential so the tail stays bounded — a transaction failing all
   * night retries on a known rhythm instead of drifting into hour-long gaps.
   */
  it.each([
    [1, 2_000],
    [2, 8_000],
    [3, 30_000],
    [4, 120_000],
    [5, 600_000],
    [6, 1_800_000],
  ])('attempt %i waits %ims', (attempt, expected) => {
    expect(backoffMs(attempt, noJitter)).toBe(expected);
  });

  it('treats a never-tried row as the first attempt rather than going negative', () => {
    // attemptCount 0 means "never tried". Indexing at -1 would read past the
    // start of the schedule.
    expect(backoffMs(0, noJitter)).toBe(2_000);
    expect(backoffMs(-5, noJitter)).toBe(2_000);
  });

  it('holds at the 30-minute cap however many attempts have been made', () => {
    for (const attempt of [6, 7, 8, 20, 1000]) {
      expect(backoffMs(attempt, noJitter)).toBe(MAX_BACKOFF_MS);
    }
  });

  it('never goes backwards', () => {
    const delays = [1, 2, 3, 4, 5, 6, 7, 8].map(a => backoffMs(a, noJitter));
    for (let i = 1; i < delays.length; i += 1) {
      expect(delays[i]!).toBeGreaterThanOrEqual(delays[i - 1]!);
    }
  });
});

describe('jitter', () => {
  /**
   * Jitter exists so that branches reconnecting together do not retry in
   * lockstep. ±20% of the base delay, derived from `random()` in [0, 1).
   */
  it('spreads a delay across ±20% of its base', () => {
    expect(backoffMs(1, () => 0)).toBe(1_600); // 2s − 20%
    expect(backoffMs(1, () => 0.5)).toBe(2_000); // 2s exactly
    expect(backoffMs(1, () => 0.999999)).toBe(2_400); // 2s + 20%
  });

  it('stays inside the band for every step of the schedule', () => {
    for (const attempt of [1, 2, 3, 4, 5, 6]) {
      const base = backoffMs(attempt, () => 0.5);
      const low = backoffMs(attempt, () => 0);
      const high = backoffMs(attempt, () => 0.999999);

      expect(low).toBeGreaterThanOrEqual(Math.round(base * 0.8));
      expect(high).toBeLessThanOrEqual(Math.round(base * 1.2));
      expect(low).toBeLessThanOrEqual(base);
      expect(high).toBeGreaterThanOrEqual(base);
    }
  });

  /** A jittered cap must still be a cap — the ceiling is 30m + 20%. */
  it('never exceeds the ceiling even at the cap with maximum jitter', () => {
    const ceiling = MAX_BACKOFF_MS * 1.2;
    for (const attempt of [6, 50, 5000]) {
      expect(backoffMs(attempt, () => 0.999999)).toBeLessThanOrEqual(ceiling);
    }
  });

  it('is always a positive whole number of milliseconds', () => {
    for (let attempt = 0; attempt <= 12; attempt += 1) {
      for (const r of [0, 0.25, 0.5, 0.75, 0.999999]) {
        const delay = backoffMs(attempt, () => r);
        expect(Number.isInteger(delay)).toBe(true);
        expect(delay).toBeGreaterThan(0);
      }
    }
  });

  it('defaults to Math.random when no source is injected', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      expect(backoffMs(1)).toBe(2_000);
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('hasExhaustedRetries', () => {
  /**
   * Parking is visible and hand-retryable, never a deletion — a parked row is
   * still the only copy of a transaction the server never accepted. What matters
   * here is only that the boundary is exact: off by one and either a transaction
   * is abandoned a try early, or it retries forever and never reaches a person.
   */
  it('parks at exactly MAX_ATTEMPTS, not before', () => {
    expect(MAX_ATTEMPTS).toBe(8);
    expect(hasExhaustedRetries(MAX_ATTEMPTS - 1)).toBe(false);
    expect(hasExhaustedRetries(MAX_ATTEMPTS)).toBe(true);
    expect(hasExhaustedRetries(MAX_ATTEMPTS + 1)).toBe(true);
  });

  it('never parks a row that has not been tried', () => {
    expect(hasExhaustedRetries(0)).toBe(false);
  });

  /**
   * The practical question this answers: how long can a transaction be retrying
   * before somebody is asked to look at it? Roughly two hours — long enough to
   * ride out a shop's connectivity outage, short enough that a genuinely stuck
   * transaction surfaces within a shift.
   */
  it('spans a bounded window before a person is involved', () => {
    let total = 0;
    for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt += 1) {
      total += backoffMs(attempt, noJitter);
    }
    const hours = total / 3_600_000;
    expect(hours).toBeGreaterThan(1);
    expect(hours).toBeLessThan(3);
  });
});
