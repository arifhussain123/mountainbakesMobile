import type { AppHeaderAction } from '@/shared/ui';
import { useAppearanceSheetStore } from './store/appearanceSheetStore';

/** The palette `AppHeaderAction` — opens the Appearance sheet directly (mode + accent), same destination `ThemeToggleButton`'s long-press reaches. */
export function usePaletteAction(): AppHeaderAction {
  const openSheet = useAppearanceSheetStore((s) => s.open);

  return {
    icon: 'palette',
    onPress: openSheet,
    accessibilityLabel: 'Change appearance',
  };
}
