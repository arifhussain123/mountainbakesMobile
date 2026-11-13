import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PRIMARY_GRADIENT, useAppTheme } from '@/shared/theme';

export interface AccentFillProps {
  borderRadius: number;
}

/**
 * The 2026 redesign's saffron gradient (#FF8A3D → #F2542D), laid behind a
 * primary button's content, in light and dark. Only for the default orange
 * accent — any other accent keeps the parent's flat `theme.colors.primary`
 * fill, so this renders nothing.
 */
export function AccentFill({ borderRadius }: AccentFillProps) {
  const theme = useAppTheme();
  if (theme.accent !== 'orange') return null;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[...PRIMARY_GRADIENT]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill, { borderRadius }]}
    />
  );
}

/** The soft saffron glow under a primary button. */
export const ACCENT_GLOW = {
  shadowColor: '#F2542D',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.32,
  shadowRadius: 14,
  elevation: 6,
} as const;
