import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MBPressable } from '@/components/common/MBPressable';
import { useTheme } from '@/theme/ThemeProvider';

export interface MBCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** 1–3. Dark mode renders no shadow and separates with borders instead. */
  elevation?: 1 | 2 | 3;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/** Surface container. The base of every list row, stat tile and form section. */
export function MBCard({
  children,
  onPress,
  elevation = 1,
  style,
  accessibilityLabel,
  testID,
}: MBCardProps): React.ReactElement {
  const theme = useTheme();

  const surface: StyleProp<ViewStyle> = [
    styles.card,
    theme.shadows[`e${elevation}` as 'e1' | 'e2' | 'e3'],
    {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.layout.cardPad,
      // Dark mode drops shadows entirely, so the border is what separates the
      // card from the background there.
      borderWidth: theme.scheme === 'dark' ? 1 : 0,
      borderColor: theme.colors.border,
    },
    style,
  ];

  if (!onPress) {
    return (
      <View style={surface} testID={testID} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }

  // The card used to darken to `surfaceSunken` while held. That is gone: the
  // press layer already scales and dims, and a surface doing both at once reads
  // as two separate things happening to one card. Colour is kept for state that
  // outlives a touch — selection, status — not for the touch itself.
  return (
    <MBPressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={surface}>
      {children}
    </MBPressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
});
