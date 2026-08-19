/** 4pt spacing scale. Every margin/padding in the app comes from here. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/**
 * Layout constants. `tapMin` is 48 rather than the iOS 44 minimum because branch
 * staff use this one-handed, at speed, often with flour on their hands.
 */
export const layout = {
  screenPad: 16,
  cardPad: 16,
  rowMinH: 64,
  tapMin: 48,
  headerH: 56,
  tabH: 56,
  railH: 72,
  inputH: 52,
  btnH: { lg: 52, md: 44, sm: 36 },
} as const;

/** Motion durations (ms). Respect AccessibilityInfo.isReduceMotionEnabled before use. */
export const motion = {
  state: 140,
  enter: 220,
  sheet: 320,
} as const;

export type Space = keyof typeof space;
export type Radius = keyof typeof radius;
