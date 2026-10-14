import { colors, tint, type AccentOption } from './colors';
import { radii } from './radii';
import { spacing } from './spacing';
import { typography } from './typography';
import { useAccentStore } from './useAccentStore';

export { colors, tint, ACCENT_OPTIONS, DEFAULT_ACCENT } from './colors';
export type { AccentOption } from './colors';
export { typography } from './typography';
export { radii } from './radii';
export { spacing } from './spacing';
export { useAccentStore } from './useAccentStore';

export interface ProductionTheme {
  colors: typeof colors & { accent: AccentOption; onAccent: string };
  typography: typeof typography;
  radii: typeof radii;
  spacing: typeof spacing;
  tint: typeof tint;
}

/**
 * The single accessor every Production screen/component reads from — never
 * import `colors`/`typography`/etc. directly outside this file, and never
 * read `useAccentStore` directly either (so a screen can't drift from the
 * rest of the app's accent).
 */
export function useProductionTheme(): ProductionTheme {
  const accent = useAccentStore((state) => state.accent);
  return {
    colors: { ...colors, accent, onAccent: colors.onAccent },
    typography,
    radii,
    spacing,
    tint,
  };
}
