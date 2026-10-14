import { StyleSheet, View, type ViewProps } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface CardProps extends ViewProps {}

/**
 * The one card chrome every section uses — the translucent "glass card" from
 * the design files (`rgba(255,255,255,.05)` fill, `rgba(255,255,255,.08)`
 * border, radius 16), not a flat solid surface. It reads correctly whether or
 * not the screen behind it has `Screen`'s gradient glow.
 */
export function Card({ style, ...rest }: CardProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.base,
        theme.cardShadow,
        {
          backgroundColor: theme.colors.cardFill,
          borderRadius: theme.radii.lg,
          borderColor: theme.colors.cardBorder,
          padding: theme.spacing.lg,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1 },
});
