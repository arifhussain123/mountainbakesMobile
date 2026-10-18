/**
 * Shared responsive sizing for Splash, Onboarding and Login — the three
 * screens whose layout runs before the rest of the app and whose fixed-size
 * tokens leave the logo/headline too small on a compact phone or too large
 * (and off-balance) on a tablet. Every size on those screens should come
 * from here rather than a literal pixel value, so one baseline change
 * updates all three consistently.
 *
 * Lives in `shared/theme` (not `src/theme`, which is the Production app's
 * own separate palette — see that module's own note) because these are
 * Branch screens, built on `shared/theme`'s `useAppTheme()`.
 *
 * Pure math is kept separate from the hook (same split as
 * `navigation/tabBar/tabBarLayout.ts`) so it's unit-testable without
 * rendering anything and without mocking `useWindowDimensions`/safe-area
 * insets.
 */
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** iPhone 13/14 — the design's baseline device. Every `sw`/`sh`/`ms` scale factor is relative to this. */
export const BASE_WIDTH = 390;
export const BASE_HEIGHT = 844;

/** Usable height (height minus top+bottom insets) below which a layout counts as "short" and should prefer the compact end of a size range. */
export const SHORT_HEIGHT_THRESHOLD = 700;

/** Width at/above which a device counts as a tablet/large screen for these three screens' max-width centering. */
export const TABLET_WIDTH_THRESHOLD = 600;

export function clamp(min: number, value: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Scales `n` by how the current width compares to the baseline width. */
export function scaleByWidth(n: number, width: number): number {
  return (width / BASE_WIDTH) * n;
}

/** Scales `n` by how the current *usable* height compares to the baseline height. */
export function scaleByHeight(n: number, usableHeight: number): number {
  return (usableHeight / BASE_HEIGHT) * n;
}

/**
 * "Moderate" scale for font sizes — `scaleByWidth` grows/shrinks linearly
 * with width, which reads as too-dramatic a jump for text between a 320px
 * phone and a 768px tablet. `factor` dials how much of that linear scale to
 * actually apply (0 = none, 1 = full linear scale); 0.5 is the usual default.
 */
export function moderateScale(n: number, width: number, factor = 0.5): number {
  return n + (scaleByWidth(n, width) - n) * factor;
}

export interface ResponsiveMetrics {
  width: number;
  height: number;
  /** `height` minus top+bottom safe-area insets — the space actually free for content. */
  usableHeight: number;
  insetTop: number;
  insetBottom: number;
  /** Usable height is cramped (a small/old phone, split-screen, or a large system font pushing content down) — layouts should prefer the compact end of their size ranges. */
  isShort: boolean;
  /** Width is tablet-sized — layouts should cap their content width and center it instead of stretching edge-to-edge. */
  isTablet: boolean;
  /** `clamp`, re-exposed on the metrics object for convenience at call sites that already destructured `useResponsive()`. */
  clamp: typeof clamp;
  /** `min(width / 393, usableHeight / 852)` — this task's own uniform scale factor; see `size()`. */
  scale: number;
  /** `clamp(min, base * scale, max)` — the per-size-spec helper this task's screens use directly. */
  size: (base: number, min: number, max: number) => number;
  sw: (n: number) => number;
  sh: (n: number) => number;
  ms: (n: number, factor?: number) => number;
  /** `isTablet ? min(max, width) : width` — the width a screen's content should be laid out at, centered when narrower than the device. `max` defaults to 480 (the general rule); Login uses 420 instead by passing it explicitly. */
  contentWidth: (max?: number) => number;
}

export const DEFAULT_CONTENT_MAX_WIDTH = 480;

/**
 * The 393x852 reference this task's own `scale`/`size()` are measured
 * against (a slightly taller baseline than `BASE_WIDTH`/`BASE_HEIGHT`'s
 * 390x844 — the two aren't meant to be reconciled into one number; `sw`/
 * `sh`/`ms` and `scale`/`size` are two independently-tuned scale systems
 * kept side by side, not duplicates of each other).
 */
export const SCALE_BASE_WIDTH = 393;
export const SCALE_BASE_HEIGHT = 852;

export function computeScale(width: number, usableHeight: number): number {
  return Math.min(width / SCALE_BASE_WIDTH, usableHeight / SCALE_BASE_HEIGHT);
}

/** The math `useResponsive()` wraps — kept free of React so it can be unit-tested directly at fixed sizes. */
export function computeResponsiveMetrics(width: number, height: number, insetTop: number, insetBottom: number): ResponsiveMetrics {
  const usableHeight = height - insetTop - insetBottom;
  const isShort = usableHeight < SHORT_HEIGHT_THRESHOLD;
  const isTablet = width >= TABLET_WIDTH_THRESHOLD;
  const scale = computeScale(width, usableHeight);

  return {
    width,
    height,
    usableHeight,
    insetTop,
    insetBottom,
    isShort,
    isTablet,
    clamp,
    scale,
    size: (base: number, min: number, max: number) => clamp(min, base * scale, max),
    sw: (n: number) => scaleByWidth(n, width),
    sh: (n: number) => scaleByHeight(n, usableHeight),
    ms: (n: number, factor = 0.5) => moderateScale(n, width, factor),
    contentWidth: (max = DEFAULT_CONTENT_MAX_WIDTH) => (isTablet ? Math.min(max, width) : width),
  };
}

/**
 * Recomputes on every rotation/window-size change — `useWindowDimensions()`
 * and `useSafeAreaInsets()` are both already reactive to that, so no extra
 * listener wiring is needed here.
 */
export function useResponsive(): ResponsiveMetrics {
  const { width, height } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  return computeResponsiveMetrics(width, height, top, bottom);
}
