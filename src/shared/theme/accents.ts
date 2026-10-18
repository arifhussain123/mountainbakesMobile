/**
 * The 5 accent options, ported from the web's own picker
 * (`frontend/src/providers/ThemeProvider.tsx`'s `ACCENTS`/`frontend/src/app/globals.css`'s
 * `[data-accent=…]` blocks) — same hues, converted from the web's oklch values
 * to sRGB hex since React Native style colors don't support oklch.
 *
 * On the web, picking an accent recolors ONLY `--primary` (and the handful of
 * tokens derived from it: ring, chart-1, sidebar-primary/ring) — never a font
 * or "mood". Mirrored exactly here: `AccentId` only ever drives
 * `colors.primary`/`primaryPressed`/`primaryText`; every other token
 * (background, surface, text tiers, borders, and the chart/data colors —
 * success/warning/danger/secondary/info/infoAlt/violet/orange/lavender) is
 * untouched by the accent choice, so a chart's meaning never shifts under a
 * user's color preference.
 *
 * `onAccentText` ("black" = a warm near-black, not pure #000, matching this
 * app's existing dark-mode primaryText convention) is picked per accent by
 * WCAG contrast ratio against the accent's own hex — not a single global
 * choice, because some accents (purple) only clear the AA threshold with
 * white text while the rest (orange/blue/green/rose) clear it with dark text.
 */
export type AccentId = 'orange' | 'blue' | 'green' | 'purple' | 'rose';

export interface AccentDef {
  id: AccentId;
  label: string;
  hex: string;
  /** ~15% darker — pressed/active button state. */
  pressedHex: string;
  /** Text/icon color to put ON a fill of `hex` — whichever of white/near-black wins WCAG contrast against it. */
  onAccentText: string;
}

const NEAR_BLACK = '#1C1917';

export const ACCENTS: Record<AccentId, AccentDef> = {
  orange: { id: 'orange', label: 'Orange', hex: '#FB6E31', pressedHex: '#D55D29', onAccentText: NEAR_BLACK },
  blue: { id: 'blue', label: 'Blue', hex: '#2389E2', pressedHex: '#1D74C0', onAccentText: NEAR_BLACK },
  green: { id: 'green', label: 'Green', hex: '#33AC5A', pressedHex: '#2B924C', onAccentText: NEAR_BLACK },
  purple: { id: 'purple', label: 'Purple', hex: '#8E57D8', pressedHex: '#7849B7', onAccentText: '#FFFFFF' },
  rose: { id: 'rose', label: 'Rose', hex: '#F04162', pressedHex: '#CC3753', onAccentText: NEAR_BLACK },
};

export const ACCENT_LIST: AccentDef[] = [ACCENTS.orange, ACCENTS.blue, ACCENTS.green, ACCENTS.purple, ACCENTS.rose];

export const DEFAULT_ACCENT: AccentId = 'orange';

export function isAccentId(value: unknown): value is AccentId {
  return typeof value === 'string' && value in ACCENTS;
}
