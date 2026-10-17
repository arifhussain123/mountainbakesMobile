import { useAppTheme } from '@/shared/theme';
import type { AppHeaderAction } from '@/shared/ui';
import { useAppearanceSheetStore } from './store/appearanceSheetStore';

/**
 * Builds the moon/sun `AppHeaderAction` every module header's `AppHeader`
 * can drop straight into its `actions` array — tap cycles Light⇄Dark
 * (`toggleLightDark`, same behavior as the web's moon icon), long-press
 * opens the full Appearance sheet (mode + accent). Not a rendered component
 * itself: `AppHeader`'s own `Pressable` renders the icon, this just supplies
 * the icon name + handlers so every header wires it up identically.
 */
export function useThemeToggleAction(): AppHeaderAction {
  const theme = useAppTheme();
  const openSheet = useAppearanceSheetStore((s) => s.open);

  return {
    // Shows the destination, not the current state — tapping a moon (shown
    // in light mode) switches TO dark, same convention the icon always uses.
    icon: theme.resolvedMode === 'dark' ? 'sun' : 'moon',
    onPress: theme.toggleLightDark,
    onLongPress: openSheet,
    accessibilityLabel: theme.resolvedMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
  };
}
