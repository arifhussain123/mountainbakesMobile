import type { ViewStyle } from 'react-native';

/** One subtle shadow style, used everywhere — CLAUDE.md Section 3: "avoid excessive shadows". */
export const cardShadow: ViewStyle = {
  shadowColor: '#2E1A12',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};
