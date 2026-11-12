import type { ViewStyle } from 'react-native';

/** One subtle shadow style, used everywhere — CLAUDE.md Section 3: "avoid excessive shadows". */
export const cardShadow: ViewStyle = {
  // 2026 redesign: a soft violet-tinted lift (was a 2px warm-brown shadow).
  shadowColor: '#4C3CAA',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.08,
  shadowRadius: 18,
  elevation: 3,
};
