import { spacing } from '@/shared/theme/spacing';
import { colors, tint } from './colors';
import { radii } from './radii';
import { typography } from './typography';

export { colors, tint } from './colors';
export { typography } from './typography';
export { radii } from './radii';
/**
 * financeApp.md's token table gives no spacing scale of its own (unlike its
 * colors/typography/radii, which are each spelled out) — reusing the app's
 * existing 8pt-ish scale (`@/shared/theme/spacing`) rather than inventing a
 * third one with no spec to justify it. Not a dependency on Branch's theme
 * as a whole, just this one shared, spec-less primitive.
 */
export { spacing } from '@/shared/theme/spacing';

export interface FinanceTheme {
  colors: typeof colors;
  typography: typeof typography;
  radii: typeof radii;
  spacing: typeof spacing;
  tint: typeof tint;
}

/** The single accessor every Finance screen/component reads from — mirrors `useProductionTheme()`'s role for the Production rebuild. */
export function useFinanceTheme(): FinanceTheme {
  return { colors, typography, radii, spacing, tint };
}
