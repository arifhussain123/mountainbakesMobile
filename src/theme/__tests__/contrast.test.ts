import { darkColors, lightColors, type SemanticColors } from '../colors';

/**
 * Contrast is a property of the palette, so it can be checked like any other
 * property — and unlike "does it look right", it has an answer.
 *
 * This exists because a colour tweak is the easiest change in the world to make
 * and the hardest to review: nudging one hex two shades lighter to "soften" a
 * screen can drop a label under the readable threshold, and nothing catches it
 * until someone cannot read the app in daylight.
 *
 * Thresholds are WCAG 2.1: 4.5:1 for body text, 3:1 for large text and for the
 * visual boundary of a UI component (1.4.11).
 */

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map(c => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

type Pair = [fg: keyof SemanticColors, bg: keyof SemanticColors, min: number, why: string];

const TEXT: Pair[] = [
  ['text', 'bg', 4.5, 'body text on the page'],
  ['text', 'surface', 4.5, 'body text on a card'],
  ['textMuted', 'bg', 4.5, 'muted text on the page'],
  ['textMuted', 'surface', 4.5, 'muted text on a card'],
  ['onPrimary', 'primary', 4.5, 'label on a primary button'],
  ['onSecondary', 'secondary', 4.5, 'label on a secondary button'],
  ['accent', 'surface', 4.5, 'link / orange-as-text on a card'],
  ['success', 'successBg', 4.5, 'success text on its tint'],
  ['warning', 'warningBg', 4.5, 'warning text on its tint'],
  ['danger', 'dangerBg', 4.5, 'danger text on its tint'],
  ['info', 'infoBg', 4.5, 'info text on its tint'],
  ['offline', 'warningBg', 4.5, 'offline text on its tint'],
];

/**
 * A control's edge is "visual information required to identify a user interface
 * component", so it takes the 3:1 non-text bar. `border` is deliberately absent:
 * it divides a card from a card, which is decoration.
 */
const CONTROLS: Pair[] = [
  ['borderControl', 'surface', 3, 'field edge against a card'],
  ['borderControl', 'bg', 3, 'field edge against the page'],
  ['focusRing', 'surface', 3, 'focused field edge against a card'],
];

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
])('%s palette', (_scheme, colors) => {
  it.each(TEXT)('reads %s on %s at %s:1 — %s', (fg, bg, min, _why) => {
    expect(Number(contrast(colors[fg], colors[bg]).toFixed(2))).toBeGreaterThanOrEqual(min);
  });

  it.each(CONTROLS)('shows %s against %s at %s:1 — %s', (fg, bg, min, _why) => {
    expect(Number(contrast(colors[fg], colors[bg]).toFixed(2))).toBeGreaterThanOrEqual(min);
  });

  /**
   * `primary` is a **fill**: it is what a button is painted with, and at 2.85:1
   * on white it is not readable as text or legible as an icon. `accent` is the
   * same brand orange darkened for exactly that use, and this asserts the two
   * have not been quietly collapsed into one value.
   */
  it('keeps a fill orange and a readable orange, and they are not the same', () => {
    expect(colors.accent).not.toBe(colors.primary);
    expect(contrast(colors.accent, colors.surface)).toBeGreaterThan(
      contrast(colors.primary, colors.surface),
    );
  });
});
