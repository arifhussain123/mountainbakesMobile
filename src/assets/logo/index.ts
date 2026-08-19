import type { ImageSourcePropType } from 'react-native';
import type { ResolvedScheme } from '@/theme/themes';

/**
 * The official Mountain Bakes mark.
 *
 * **This is the real brand asset, not a placeholder.** It is the same artwork the
 * web client serves from `public/assets/images/logo/logo.png` — the red badge
 * with the chef's-hat mountain and "Delight in every bite". Do not redraw it,
 * recolour it, or replace it with a wordmark.
 *
 * (Note for anyone comparing trees: the web client also has a `logo.svg` next to
 * that PNG which is a completely different orange-gradient glyph. That SVG is a
 * stale placeholder, not the brand — match the PNG.)
 *
 * ---------------------------------------------------------------------------
 * The native boot splash draws this same mark, from its own copies
 * ---------------------------------------------------------------------------
 * `react-native-bootsplash` cannot `require` a JS module, so it has a second set:
 * the Android drawables under `res/drawable-<density>/bootsplash_logo.png`, and
 * the `assets/bootsplash/` rasters. Both are downscaled from
 * `assets/bootsplash_logo.png`, which is the `dark` artwork — pale rim and all —
 * because the drawable is one file shown over both `bootsplash_background`
 * colours, and the rim is what carries the badge edge on the dark one while
 * staying invisible on cream.
 *
 * It is drawn at **112dp**, centred on the 288dp Android 12 splash canvas. That
 * number is not arbitrary: it is the width `SplashScreen.tsx` renders, so the
 * hand-off from the native splash to the JS one does not resize the logo.
 *
 * Changing the brand mark means regenerating those files too, not just dropping
 * new PNGs in here.
 *
 * ---------------------------------------------------------------------------
 * `-light` / `-dark` name the THEME, not the artwork
 * ---------------------------------------------------------------------------
 * `-light` is the mark to draw **on a light background**, `-dark` the one to
 * draw on a dark background. It reads the other way round at a glance, which is
 * exactly why `logoFor()` exists — call it with the scheme and never pick a file
 * by hand.
 *
 * The two differ by a soft pale rim on `-dark`: the badge's outer ring is gold
 * on deep red, which all but disappears against `bg` in dark mode. The rim is
 * what keeps the edge of the badge readable there, and it is invisible against
 * cream, which is why the base file and `-light` are byte-identical.
 *
 * Densities are `@1x 128 · @2x 256 · @3x 384`, downscaled from a 512 master, so
 * Metro picks the right raster and nothing is ever upscaled. Reference the base
 * name only — `require` resolves the suffix.
 */
export const LOGO = {
  /** Alias of `light`. Use `logoFor()` unless you know the background. */
  default: require('./mountain-bakes-logo.png') as ImageSourcePropType,
  light: require('./mountain-bakes-logo-light.png') as ImageSourcePropType,
  dark: require('./mountain-bakes-logo-dark.png') as ImageSourcePropType,
} as const;

/** The mark for a resolved scheme. The one correct way to choose a variant. */
export function logoFor(scheme: ResolvedScheme): ImageSourcePropType {
  return scheme === 'dark' ? LOGO.dark : LOGO.light;
}

