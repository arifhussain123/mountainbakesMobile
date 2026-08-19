import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the OS asks for reduced motion, kept live.
 *
 * The setting is read once on mount **and** subscribed to, which is the part a
 * one-shot `isReduceMotionEnabled()` call gets wrong: someone who turns the
 * setting on because an animation is making them ill has to kill and reopen the
 * app before anything stops moving. Android exposes it as "Remove animations"
 * and iOS as "Reduce Motion"; React Native reports both through this one API.
 *
 * The default while the first read is in flight is `false` — animations run
 * until told otherwise. Defaulting the other way would make every screen flash
 * from static to animated a frame later, which is itself a motion artefact.
 *
 * ---------------------------------------------------------------------------
 * One subscription for the whole app, not one per caller
 * ---------------------------------------------------------------------------
 * `MBPressable` calls this, and `MBPressable` is every tappable surface — so a
 * 200-row list used to mount 200 native event listeners and fire 200 async
 * bridge calls to read one process-wide boolean, all of which resolve to the
 * same answer and each of which costs a state update on arrival. Scrolling a
 * catalogue paid that on every row that came into view.
 *
 * The state is therefore module-level and read through `useSyncExternalStore`:
 * one listener on the OS, one async read, and every consumer re-rendering off
 * the same snapshot. The subscription is ref-counted rather than permanent so a
 * test (or a screen that unmounts the whole tree) leaves nothing attached.
 *
 * ---------------------------------------------------------------------------
 * What honouring it means
 * ---------------------------------------------------------------------------
 * **Suppress the motion, keep the change.** A screen still arrives, a tab still
 * becomes active, a sheet still opens — they simply arrive without travelling.
 * Slowing an animation down is not honouring the setting; it is the same
 * movement for longer. Cross-fades are the accepted substitute and are what
 * `screenAnimation()` falls back to.
 */

let reduced = false;
let subscription: { remove: () => void } | null = null;
const listeners = new Set<() => void>();

function emit(next: boolean): void {
  if (next === reduced) return;
  reduced = next;
  listeners.forEach(l => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // First consumer arms the OS listener; the read is fired once, not per caller.
  if (!subscription) {
    subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', emit);
    AccessibilityInfo.isReduceMotionEnabled()
      .then(emit)
      // A device that cannot answer keeps the `false` default — animations run.
      .catch(() => {});
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      subscription?.remove();
      subscription = null;
    }
  };
}

function getSnapshot(): boolean {
  return reduced;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
