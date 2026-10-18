import { useWindowDimensions } from 'react-native';
import type { AppHeaderAction } from '@/shared/ui';
import { usePaletteAction } from './PaletteButton';
import { useThemeToggleAction } from './ThemeToggleButton';

/** Below this width the palette + moon/sun icons would crowd the header next to the bell and menu — collapse them into one "Appearance" button instead. */
const NARROW_HEADER_BREAKPOINT = 360;

/**
 * Palette + moon/sun as a module header would place them: two separate
 * `AppHeaderAction`s on a normal-width screen, collapsed into a single
 * "Appearance" action (opens the same sheet) under 360dp.
 */
export function useAppearanceHeaderActions(): AppHeaderAction[] {
  const { width } = useWindowDimensions();
  const paletteAction = usePaletteAction();
  const themeToggleAction = useThemeToggleAction();

  if (width < NARROW_HEADER_BREAKPOINT) {
    // Keeps the moon/sun icon (so the current mode is still visible at a
    // glance) but taps now open the sheet, same as the palette button would,
    // since there's no room left for both as separate actions.
    return [{ ...themeToggleAction, onPress: paletteAction.onPress, onLongPress: undefined, accessibilityLabel: 'Change appearance' }];
  }

  return [paletteAction, themeToggleAction];
}
