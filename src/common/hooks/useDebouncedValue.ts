import { useEffect, useState } from 'react';

/**
 * Debounce a rapidly-changing value.
 *
 * Used for search terms. The server deliberately does NOT cache free-text
 * product searches — they are pass-through so results are always fresh — so an
 * un-debounced field issues one uncached query per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
