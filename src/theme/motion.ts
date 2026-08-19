import type { WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

/**
 * Motion tokens.
 *
 * Every animation in the app draws its duration and its curve from here, for the
 * same reason every margin comes from `space`: three developers each picking
 * "about 200ms, feels right" is how one app ends up with four different senses
 * of speed. A tab that springs, a sheet that eases and a card that snaps are not
 * three tasteful choices — they read as three different apps.
 *
 * These used to live in `spacing.ts` as three bare numbers with a comment saying
 * to respect Reduce Motion before using them. Nothing did, because nothing was
 * animated yet. Now that navigation moves, the tokens carry the curves too and
 * `useReducedMotion()` is the thing that honours the setting.
 *
 * ---------------------------------------------------------------------------
 * The one rule
 * ---------------------------------------------------------------------------
 * Motion here is **feedback, never decoration**. Each duration is tied to what
 * the movement is telling the user:
 *
 *   state (120ms)  a control acknowledging a touch — must land before the finger
 *                  lifts, or it reads as lag rather than response
 *   enter (220ms)  a screen or element arriving; long enough to show where it
 *                  came from, short enough not to be waited on
 *   sheet (320ms)  a surface travelling the full height of the screen
 *
 * Nothing in this app animates a number counting up, a chart drawing itself, or
 * a card sliding in on scroll. Staff run the sales screen dozens of times a day;
 * an animation they have to sit through is a tax charged once per sale.
 */

export const duration = {
  /** Press, focus, colour and opacity changes on a control. */
  state: 120,
  /** A screen or element arriving on-screen. */
  enter: 220,
  /** A full-height surface: modal, drawer, bottom sheet. */
  sheet: 320,
  /**
   * One turn of a progress glyph — the sync indicator while a drain is running.
   *
   * The odd one out: every other value here is how long a change takes, and this
   * is how long a loop lasts. It earns its place because it is still feedback —
   * it runs only while work is actually in flight and stops the moment the drain
   * ends. Nothing in this app spins to look busy.
   */
  spin: 1000,
  /**
   * Half a skeleton pulse — the placeholder breathing while a screen's first
   * load is in flight. A loop for the same reason `spin` is one, and under the
   * same condition: it runs only while there is genuinely nothing to show, and
   * the moment data lands the block is replaced rather than faded out.
   */
  pulse: 800,
} as const;

/**
 * Springs, not curves, for anything that can be interrupted mid-flight.
 *
 * A spring finishes when the physics settles rather than when a clock runs out,
 * so an interrupted gesture picks up from wherever the last one was instead of
 * snapping back to the start. `damping` is high and `overshootClamping` is on
 * for `press`: a bouncing control feels toy-like on a point-of-sale screen, and
 * an overshooting tab icon collides with the pill drawn behind it.
 *
 * Note that `spring.press` and `press` below are not the same thing and are not
 * used together. The spring is what carries the tab indicator between slots — a
 * journey a third tap can cut across. The amounts below are what a control does
 * under a finger, and that runs on `timing.state`: a press has a fixed, known
 * end (the finger lifting), so there is nothing for physics to settle.
 */
export const spring = {
  /** The tab indicator travelling between slots. Firm, no bounce. */
  press: {
    damping: 18,
    stiffness: 260,
    mass: 0.6,
    overshootClamping: true,
  } satisfies WithSpringConfig,
  /** Larger elements settling into place. A trace of overshoot is allowed. */
  settle: {
    damping: 20,
    stiffness: 180,
    mass: 0.9,
  } satisfies WithSpringConfig,
} as const;

/**
 * How far a control moves and dims while a finger is on it.
 *
 * Two percent of scale and six of opacity is deliberately near the threshold of
 * being noticed: the point is that a tap **registers**, not that it performs.
 * Anything deeper starts to read as the control being dragged, and on a screen
 * where a cashier taps a product tile forty times an hour a visible squash
 * becomes the thing they see instead of the price.
 *
 * The scale is the part Reduce Motion drops — it is the only travel here. The
 * opacity shift stays, because the control still has to acknowledge the touch;
 * suppressing the acknowledgement altogether would answer a request for less
 * movement by removing feedback, which is not the same thing. See
 * `pressTargets()` in `MBPressable`, which is where this rule actually lives.
 */
export const press = {
  scale: 0.98,
  opacity: 0.94,
} as const;

export const timing = {
  state: { duration: duration.state } satisfies WithTimingConfig,
  enter: { duration: duration.enter } satisfies WithTimingConfig,
  sheet: { duration: duration.sheet } satisfies WithTimingConfig,
} as const;

/**
 * The whole motion token set, as it hangs off the theme.
 *
 * Kept flat-ish and shared between light and dark: motion does not change with
 * the scheme, and a second copy would be a second thing to keep in step.
 */
export const motion = {
  ...duration,
  duration,
  press,
  spring,
  timing,
} as const;

export type Motion = typeof motion;
