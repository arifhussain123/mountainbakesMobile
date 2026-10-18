import { useCallback, useEffect, useState } from 'react';
import { isApproveUnlocked, MIN_REVIEW_MS, REVIEW_GATE_ENABLED } from '../utils/reviewSpeed';

/**
 * The Approve button's gate for one record: unlocked once the reviewer opened
 * its photo or read the detail to the end, and has had it open MIN_REVIEW_MS.
 * `recordId` resets everything — the same sheet is reused across records.
 */
export function useReviewGate(recordId: string, enabled: boolean = REVIEW_GATE_ENABLED) {
  const [openedPhoto, setOpenedPhoto] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setOpenedPhoto(false);
    setScrolledToEnd(false);
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
  }, [recordId]);

  const elapsed = now - startedAt;
  useEffect(() => {
    if (!enabled || elapsed >= MIN_REVIEW_MS) return;
    const timer = setTimeout(() => setNow(Date.now()), MIN_REVIEW_MS - elapsed + 20);
    return () => clearTimeout(timer);
  }, [enabled, elapsed]);

  const unlocked = isApproveUnlocked({ enabled, openedPhoto, scrolledToEnd, msOnDetail: elapsed });
  const hint = unlocked ? null : openedPhoto || scrolledToEnd ? 'Approve unlocks in a moment.' : 'Open the photo or read to the end to enable Approve.';

  return {
    unlocked,
    hint,
    markPhotoOpened: useCallback(() => setOpenedPhoto(true), []),
    markScrolledToEnd: useCallback(() => setScrolledToEnd(true), []),
  };
}
