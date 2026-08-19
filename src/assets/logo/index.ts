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
