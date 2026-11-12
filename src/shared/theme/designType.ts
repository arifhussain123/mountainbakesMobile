import { StyleSheet } from 'react-native';

/**
 * The 2026 redesign's type scale (mockup `common.py` "v4 type" block). Sizes
 * and weights only — colours come from the theme at the call site. Urbanist
 * is applied app-wide, so no fontFamily here.
 */
export const designType = StyleSheet.create({
  h1: { fontSize: 32, lineHeight: 38, fontWeight: '600', letterSpacing: -1 },
  h2: { fontSize: 21, lineHeight: 27, fontWeight: '600', letterSpacing: -0.4 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  /** A row title one step down from h3 (list rows, compact cards). */
  h3s: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  p: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  sm: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  eyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.6 },
  label: { fontSize: 14, fontWeight: '600' },
  kpiK: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  kpiV: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  amt: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
});

/** Text on the violet hero card: its eyebrow, the big figure and the small lines. */
export const heroType = StyleSheet.create({
  eyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.6 },
  amount: { fontSize: 34, lineHeight: 40, fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  sm: { fontSize: 13, lineHeight: 18 },
});
