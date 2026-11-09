import { Platform, type TextStyle } from 'react-native';

/**
 * Space Grotesk — the "Grotesk" font setting of the design files. The three
 * static faces live in `assets/fonts/` (OFL licence beside them) and are
 * linked on both platforms:
 *   - Android reads `android/app/src/main/assets/fonts/<name>.ttf` by file name.
 *   - iOS reads the PostScript name (`UIAppFonts` in Info.plist + the Xcode
 *     Resources phase). The file names equal the PostScript names, so one
 *     string works on both platforms.
 */
export const fonts = {
  regular: 'SpaceGrotesk-Regular',
  medium: 'SpaceGrotesk-Medium',
  bold: 'SpaceGrotesk-Bold',
} as const;

export type FontToken = keyof typeof fonts;

const WEIGHT_OF: Record<FontToken, NonNullable<TextStyle['fontWeight']>> = {
  regular: '400',
  medium: '500',
  bold: '700',
};

/**
 * The `fontFamily`/`fontWeight` pair for one face.
 *
 * iOS resolves a PostScript name and then re-picks the face in that family
 * closest to `fontWeight` — so the weight MUST be declared, or a Bold family
 * name with the default (400) weight renders the Regular face.
 * Android resolves the file name alone and, on older API levels, would
 * synthesize a faux-bold on top of the already-bold file when `fontWeight`
 * is also set — so there the weight is left at normal.
 */
export function font(
  token: FontToken,
): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return {
    fontFamily: fonts[token],
    fontWeight: Platform.OS === 'ios' ? WEIGHT_OF[token] : 'normal',
  };
}
