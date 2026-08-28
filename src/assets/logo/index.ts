import type { ImageSourcePropType } from 'react-native';
import type { ResolvedScheme } from '@/common/theme/themes';

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
 * ---------------------------------------------------------------------------
 * The two splashes now draw the badge at the same size. They did not.
 * ---------------------------------------------------------------------------
 * This paragraph used to say the drawable was 112dp and that 112 "is the width
 * `SplashScreen.tsx` renders, so the hand-off does not resize the logo". The
 * second half was **wrong**: `SplashScreen.tsx` rendered 196, so the badge grew
 * about 84% the instant the JS splash mounted and called `RNBootSplash.hide()`.
 * Nothing caught it — `scripts/check-splash-colour.sh` checks the background
 * colour, and there is no equivalent for the logo's size.
 *
 * Measured, at every density (the canvas is 288dp in all five buckets):
 *
 *   drawable canvas        288dp        (Android 12's splash icon canvas)
 *   drawable `logoWidth`   192dp        the platform ceiling — see below
 *   visible badge          170.8dp      the hard disc, ignoring the pale rim
 *   SplashScreen.tsx       171dp        rounded to meet it
 *
 * **192dp is a hard ceiling, not a preference.** The generator refuses a
 * `--logo-width` above 192 outright ("Logo exceeds 192x192dp and will be cropped
 * by Android"), because Android masks the icon to a 192dp circle on the 288dp
 * canvas. It additionally warns above 134dp — that is 192/√2, the largest
 * *square* inscribed in that circle, and it is a false positive here: this badge
 * is a disc, and the corners the mask would take are transparent. Verified
 * rather than assumed — zero opaque pixels fall outside the 192dp circle, the
 * furthest sitting at 183.6dp.
 *
 * The badge is 170.8dp rather than 192 because the source spends ~11% of its
 * width on the pale rim. So **v4's 196dp is unreachable natively**: it would
 * need a 220dp image, and the cap is 192. The JS side comes down to meet the
 * native one instead, which is the only direction that closes the gap.
 *
 * Regenerate with, from the project root:
 *
 *     npx react-native-bootsplash generate assets/bootsplash_logo.png \
 *       --platforms android --logo-width 192 --background '#FDF7EA'
 *
 * **It rewrites more than the drawables, and it strips comments.** It rewrote
 * `AndroidManifest.xml` (deleting the deep-link block explaining why the
 * `https://` prefix is deliberately not claimed) and `values/colors.xml`
 * (deleting the block explaining why `app_background` and
 * `bootsplash_background` differ). Both had to be restored by hand afterwards.
 * Check `git diff` on those two files after every run.
 *
 * Changing the brand mark means regenerating those files too, not just dropping
 * new PNGs in here — and changing `logo` in `SplashScreen.tsx` to whatever the
 * new badge measures.
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

