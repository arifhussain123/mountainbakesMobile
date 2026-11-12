/**
 * 2026 redesign ("lavender 3D") — the gradients, pastel tiles and 3D-shape
 * colours that don't fit `ThemeColors`' flat-token shape. Source: the Figma
 * file dTwAoYFfccfAV8o3fjwq9m / `design UIandUX/redesign-2026/common.py`.
 *
 * Light mode uses these; dark mode keeps its own flat look, so components
 * check `theme.isDark` before reaching for them.
 */

/** Primary buttons, the active tab bubble, FABs: saffron, top-left → bottom-right. */
export const PRIMARY_GRADIENT = ['#FF8A3D', '#F2542D'] as const;

/** Hero/total cards (Sales today, Cash in hand…): violet, 145°. White text on it. */
export const HERO_GRADIENT = ['#A594FF', '#7F6BF2', '#5B48D8'] as const;

/** Frosted chips nested inside a hero card (white-on-violet). */
export const HERO_CHIP = {
  fill: 'rgba(255, 255, 255, 0.16)',
  border: 'rgba(255, 255, 255, 0.22)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.80)',
} as const;

/** Pastel stat tiles — cycle through these (dark navy text on all of them). */
export const PASTEL_TILES = [
  { from: '#C9F4DA', to: '#9FE3BC' }, // mint
  { from: '#C6F4F7', to: '#9EE6EE' }, // aqua
  { from: '#FFDDA0', to: '#FFC266' }, // amber
  { from: '#DCD3FF', to: '#BCAEFF' }, // lilac
  { from: '#FBD3F6', to: '#F3A9EC' }, // pink
] as const;

export type PastelTone = 0 | 1 | 2 | 3 | 4;

/** A stable tone for a label, so the same stat always gets the same colour. */
export function toneFor(key: string): PastelTone {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  return (Math.abs(h) % PASTEL_TILES.length) as PastelTone;
}

/** 3D sphere/ball colour stops: highlight → body → shade. */
export const SPHERES = {
  saffron: ['#FFE9C2', '#FFAD4D', '#F2542D', '#B8321A'],
  lilac: ['#FFFFFF', '#D6CCFF', '#8E7CFF', '#5B48D8'],
  mint: ['#F2FFF7', '#A8EBC4', '#3FBF7F', '#1E8C5A'],
  gold: ['#FFF0A8', '#FFC92E', '#E5A400', '#B37E00'],
} as const;

export type SphereTone = keyof typeof SPHERES;

/** Warm taupe for inactive bottom-tab icons/labels (light mode). */
export const NAV_INK = '#7A685C';

/** Violet-tinted soft shadow for light-mode cards. */
export const SOFT_SHADOW = {
  shadowColor: '#4C3CAA',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.08,
  shadowRadius: 18,
  elevation: 3,
} as const;
