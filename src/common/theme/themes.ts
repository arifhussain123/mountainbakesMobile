import {
  darkColors,
  darkColorsFor,
  lightColors,
  lightColorsFor,
  statusColors,
  type SemanticColors,
  type StatusColorKey,
} from './colors';
import { DEFAULT_ACCENT, type AccentKey } from './accents';
import { iconSize, iconStroke } from './iconSizes';
import { darkShadows, lightShadows, type Shadows } from './shadows';
import { motion, type Motion } from './motion';
import { radius } from './radius';
import { layout, space } from './spacing';
import {
  DEFAULT_TYPEFACE,
  familiesFor,
  fontFamily,
  type FontFamilies,
  type,
  typeFor,
  weight,
  type TypefaceKey,
  type TypeScale,
} from './typography';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

/**
 * The mode a device gets before anyone has chosen one — **light, not system**.
 *
 * `system` is the conventional default and it is the wrong one here, because
 * this app's two schemes are not two designs. v6 draws twenty-one screens and
 * every one of them is light; the dark map is a derivation with no counterpart
 * in the spec. Defaulting to `system` meant a majority of phones — night mode is
 * on by default on a lot of Android skins — opened an app that had never been
 * designed, and the first report back was exactly that: "the colours are grey,
 * not the design."
 *
 * So the app opens in the design. `system` remains selectable in Appearance and
 * is still honoured by `ThemeProvider`; it is simply no longer what you get by
 * accident. Note this only affects a device with nothing stored — anyone who has
 * already chosen a mode keeps it, because `initialThemeMode` reads MMKV first.
 */
export const DEFAULT_THEME_MODE: ThemeMode = 'light';

export interface Theme {
  scheme: ResolvedScheme;
  colors: SemanticColors;
  shadows: Shadows;
  type: TypeScale;
  fontFamily: FontFamilies;
  weight: typeof weight;
  space: typeof space;
  radius: typeof radius;
  layout: typeof layout;
  motion: Motion;
  /**
   * Icon sizes and stroke weights. On the theme beside `space` and `radius`
   * because that is where a reader looks for a token, even though neither
   * varies by scheme. `theme/iconSizes.ts` still exports both directly, which is
   * what module-scope `StyleSheet.create` calls need — a hook cannot run there.
   */
  iconSize: typeof iconSize;
  iconStroke: typeof iconStroke;
  statusColors: typeof statusColors;
}

const base = {
  type,
  fontFamily,
  weight,
  space,
  radius,
  layout,
  motion,
  iconSize,
  iconStroke,
  statusColors,
} as const;

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  shadows: lightShadows,
  ...base,
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  shadows: darkShadows,
  ...base,
};

/**
 * The theme for a scheme and a chosen accent.
 *
 * The default accent returns the shared `lightTheme` / `darkTheme` objects by
 * identity, not a copy. That matters beyond tidiness: the theme is a context
 * value, and handing back a fresh object for the unchanged case would make every
 * consumer re-render on any provider re-evaluation. Accents other than the
 * default build one object, memoised by the provider.
 */
export function themeFor(
  scheme: ResolvedScheme,
  accent: AccentKey = DEFAULT_ACCENT,
  typeface: TypefaceKey = DEFAULT_TYPEFACE,
): Theme {
  const fallback = scheme === 'dark' ? darkTheme : lightTheme;
  // Both at their default is the common case and returns the shared object.
  if (accent === DEFAULT_ACCENT && typeface === DEFAULT_TYPEFACE) return fallback;

  return {
    ...fallback,
    /* Each preference is applied only if it moved. `lightColorsFor` and
       `typeFor` both return their base by identity for the default, so this is
       belt-and-braces rather than necessary — but it keeps the shape obvious:
       two independent controls, neither reaching into the other's tokens. */
    colors:
      accent === DEFAULT_ACCENT
        ? fallback.colors
        : scheme === 'dark'
          ? darkColorsFor(accent)
          : lightColorsFor(accent),
    type: typeFor(typeface),
    fontFamily: familiesFor(typeface),
  };
}

export type { SemanticColors, StatusColorKey, AccentKey, TypefaceKey, TypeScale };
