/**
 * The theme's public surface.
 *
 * Components should read tokens through `useTheme()` — the scheme is a runtime
 * value, so a component that imports `lightColors` directly is a component that
 * will not follow a theme switch. The direct exports below exist for the two
 * places a hook cannot run: module-scope `StyleSheet.create`, which needs
 * scheme-independent tokens (`space`, `radius`, `iconSize`), and the native
 * bridge in `RootNavigator`.
 *
 * ---------------------------------------------------------------------------
 * File names, settled
 * ---------------------------------------------------------------------------
 * Two briefs named these files differently — one asked for `themes.ts` +
 * `iconSizes.ts`, the other for `theme.ts` + `dimensions.ts`. **Current names
 * stand.** Do not rename on the strength of a doc that says otherwise:
 *
 *   - `themes.ts` is plural because it exports `lightTheme` **and** `darkTheme`
 *     plus `themeFor(scheme)`. It composes two themes; it is not one theme.
 *   - `layout{}` stays in `spacing.ts` beside `space{}` because the two are read
 *     together — `screenPad` and `space.lg` are the same decision — and a
 *     `dimensions.ts` would split that pair to satisfy a filename.
 *   - `iconSizes.ts` says what it holds. `dimensions.ts` would hold icon sizes,
 *     tap targets and breakpoints, which is three unrelated things under a word
 *     that means all of them.
 *
 * `palette` is deliberately **not** re-exported. Raw ramp names (`brown500`)
 * are an implementation detail of `colors.ts`; a component naming one has
 * bypassed the semantic layer and will not survive a palette change.
 */

export { ThemeProvider, useTheme, useThemeContext } from './ThemeProvider';

export {
  darkTheme,
  lightTheme,
  themeFor,
  type ResolvedScheme,
  type SemanticColors,
  type StatusColorKey,
  type Theme,
  type ThemeMode,
} from './themes';

export { darkColors, lightColors, statusColors } from './colors';
export { iconSize, iconStroke } from './iconSizes';
export { motion, type Motion } from './motion';
export { radius } from './radius';
export { darkShadows, lightShadows, type Shadows } from './shadows';
export { layout, space } from './spacing';
export { fontFamily, type, weight } from './typography';
