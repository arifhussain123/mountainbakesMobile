import { useCallback, useRef, useState } from 'react';
import { generateIdempotencyKey } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { describeApiError, isConflict, keyForBody, type SubmissionKey } from '../utils/submission';

export type SubmissionOutcome<T> =
  | { kind: 'done'; value: T }
  | { kind: 'failed'; message: string; conflict: boolean; error: unknown }
  | { kind: 'busy' };

/**
 * One submission at a time, with its idempotency key.
 *
 *   - ONE IN FLIGHT. A ref, not the mutation's `isPending`: that flag only
 *     flips on the next render, so a second tap in the same frame would get
 *     through it.
 *   - ONE KEY PER SUBMISSION. Minted for the body on the first attempt and
 *     reused while the body is unchanged (a retry after a timeout is the same
 *     request); an edited body gets a fresh key, and a success retires it.
 *
 * `run(body, call)` hands `call` the key; endpoints without replay protection
 * simply ignore it and still get the double-tap guard.
 */
export function useSubmission(prefix: string) {
  const inFlight = useRef(false);
  const current = useRef<SubmissionKey | null>(null);
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T,>(body: unknown, call: (key: string) => Promise<T>): Promise<SubmissionOutcome<T>> => {
      if (inFlight.current) return { kind: 'busy' };
      inFlight.current = true;
      setPending(true);
      const k = keyForBody(current.current, body, () => generateIdempotencyKey(prefix));
      current.current = k;
      try {
        const value = await call(k.key);
        current.current = null;
        return { kind: 'done', value };
      } catch (error) {
        return { kind: 'failed', message: describeApiError(error, mapErrorToMessage), conflict: isConflict(error), error };
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [prefix],
  );

  const reset = useCallback(() => {
    current.current = null;
  }, []);

  return { run, pending, reset };
}
