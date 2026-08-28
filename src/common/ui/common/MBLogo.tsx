import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { logoFor } from '@/assets/logo';
import { useTheme } from '@/common/theme/ThemeProvider';

/**
 * The Mountain Bakes mark, at the right variant for the current scheme.
 *
 * The variant choice goes through `logoFor()` — `-light` and `-dark` name the
 * **background** they sit on, not the artwork, which reads backwards at a glance
 * and is exactly the kind of thing that gets picked wrong by hand. See
 * `assets/logo/index.ts`.
 *
 * Hidden from the screen reader. Everywhere the mark appears, the text beside it
 * already says where the user is; announcing the brand first would only delay
 * the part that answers the question.
 */
export interface MBLogoProps {
  /** Rendered square, in dp. Defaults to the account panel's size. */
  size?: number;
}

export function MBLogo({ size = 40 }: MBLogoProps): React.ReactElement {
  const theme = useTheme();

  return (
    <Image
      source={logoFor(theme.scheme)}
      accessibilityElementsHidden
      importantForAccessibility="no"
      resizeMode="contain"
      /* Android cross-fades an image in over 300ms by default. That is a
         reasonable guess for a photograph arriving over a network and wrong
         for a raster that ships inside the APK and is already decoded — it
         reads as the brand mark loading slowly on a screen that is otherwise
         instant. There is nothing to wait for, so nothing fades. */
      fadeDuration={0}
      style={[styles.logo, { width: size, height: size }]}
    />
  );
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'flex-start' },
});
