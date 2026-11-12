import { StyleSheet } from 'react-native';

/**
 * The 2026 redesign's type scale (mockup common.py "v4 type" block), for the
 * dashboard's own components. Colours come from the theme at the call site.
 */
export const dashType = StyleSheet.create({
  h1: { fontSize: 32, lineHeight: 38, fontWeight: '600', letterSpacing: -1 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  p: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  sm: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  eyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.6 },
  kpiK: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  kpiV: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  amt: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
});
