import { useMemo } from 'react';
import { useSettings } from '@/hooks/useCatalog';
import {
  hhmmToMinutes,
  isWithinOrderWindow,
  karachiMinutesOfDay,
  karachiTimeStr,
  ORDER_WINDOW_CLOSE_MINUTES,
  ORDER_WINDOW_OPEN_MINUTES,
} from '@/shared/utils/timezone';

/**
 * When a branch may place a demand on production.
 *
 * ---------------------------------------------------------------------------
 * Nothing here is invented
 * ---------------------------------------------------------------------------
 * The window is the server's, read from the same two settings its own
 * `orderWindowMinutes()` reads — `orderStartTime` / `orderEndTime` — falling back
 * to the same mirrored constants when settings are absent
 * (`ORDER_WINDOW_OPEN_MINUTES` 480 = 08:00, `ORDER_WINDOW_CLOSE_MINUTES` 120 =
 * 02:00). `isWithinOrderWindow` is the mirrored predicate, and it is the one
 * thing here worth reading twice: **the window wraps past midnight**, so 23:30 is
 * inside it and 03:00 is not, and a naive `open <= m && m <= close` would have it
 * backwards for most of the evening.
 *
 * If the window ever needs to change, it changes in settings on the server. Do
 * not add a constant to this file.
 *
 * ---------------------------------------------------------------------------
 * Why the client checks at all
 * ---------------------------------------------------------------------------
 * The server is authoritative and rejects a late order regardless. But every
 * write in this app is offline-first: a demand composed at 03:00 with no signal
 * is queued, drained later, refused, and **parked as a failed row** — so the
 * branch believes an order is placed, production never sees it, and the only
 * trace is a row in Sync Center someone has to notice. Checking before the write
 * turns a silent lost order into a sentence on screen.
 */
export interface OrderWindow {
  /** Whether an order may be placed right now, in Karachi time. */
  isOpen: boolean;
  /** 'HH:mm' bounds, for telling the user what the window actually is. */
  opensAt: string;
  closesAt: string;
  /** Karachi 'HH:mm' now — the clock the rule is judged against, not the device's. */
  nowAt: string;
  /** True until settings have loaded; callers should not block a submit on a guess. */
  isLoading: boolean;
}

function minutesToHhmm(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function useOrderWindow(): OrderWindow {
  const settings = useSettings();
  const start = settings.data?.orderStartTime;
  const end = settings.data?.orderEndTime;

  return useMemo(() => {
    // Same precedence as the server: a configured value wins, a malformed or
    // missing one falls back to the shared constant rather than to "always open".
    const openMin = (start ? hhmmToMinutes(start) : null) ?? ORDER_WINDOW_OPEN_MINUTES;
    const closeMin = (end ? hhmmToMinutes(end) : null) ?? ORDER_WINDOW_CLOSE_MINUTES;

    return {
      isOpen: isWithinOrderWindow(karachiMinutesOfDay(), openMin, closeMin),
      opensAt: minutesToHhmm(openMin),
      closesAt: minutesToHhmm(closeMin),
      nowAt: karachiTimeStr(),
      isLoading: settings.isPending,
    };
  }, [start, end, settings.isPending]);
}
