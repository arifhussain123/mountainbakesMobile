/**
 * Every non-code asset in the app, in one place.
 *
 *   logo/          the official brand mark (raster, @1x/@2x/@3x)
 *   illustrations/ empty and error states (vector components, theme-aware)
 *   images/        product placeholder (vector component, theme-aware)
 *   icons/         intentionally empty — see its README; icons are Lucide
 *
 * The split is between artwork that is **fixed** and artwork that must **follow
 * the palette**. The logo is fixed: it is a brand asset with its own colours and
 * it must look identical everywhere, so it is a raster with a light/dark pair.
 * Everything else is line art that sits behind text on `bg` or `surface`, so it
 * is a vector reading `useTheme()` and there is exactly one copy of each drawing.
 */

export { LOGO, logoFor } from './logo';

export {
  ILLUSTRATIONS,
  MBIllustration,
  type IllustrationKey,
  type IllustrationProps,
} from './illustrations';

export { IMAGES, ProductPlaceholder, type ImageKey } from './images';
