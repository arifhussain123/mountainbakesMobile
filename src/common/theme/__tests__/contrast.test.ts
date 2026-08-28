import {
  darkColors,
  darkColorsFor,
  lightColors,
  lightColorsFor,
  type SemanticColors,
} from '../colors';
import { ACCENT_KEYS, DEFAULT_ACCENT } from '../accents';

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

/**
 * The colour-valued keys only. `series` is a tuple, not a colour, and indexing
 * a `keyof SemanticColors` would widen every lookup below to include it.
 */
type ColorKey = {
  [K in keyof SemanticColors]: SemanticColors[K] extends string ? K : never;
}[keyof SemanticColors];

type Pair = [fg: ColorKey, bg: ColorKey, min: number, why: string];

const TEXT: Pair[] = [
  ['text', 'bg', 4.5, 'body text on the page'],
  ['text', 'surface', 4.5, 'body text on a card'],
  ['textSubtle', 'bg', 4.5, 'second-level text on the page'],
  ['textSubtle', 'surface', 4.5, 'second-level text on a card'],
  ['textMuted', 'bg', 4.5, 'muted text on the page'],
  ['textMuted', 'surface', 4.5, 'muted text on a card'],
  ['onPrimary', 'primary', 4.5, 'label on a primary button'],
  // The hero block is a whole inverse surface with its own three levels, not a
  // button with one label — a KPI, the caption over it, and the one highlight
  // v4 allows beside it. All three are read, so all three take the text bar.
  ['onSecondary', 'secondary', 4.5, 'the figure on a hero block'],
  ['onSecondaryMuted', 'secondary', 4.5, 'the caption on a hero block'],
  ['onSecondaryAccent', 'secondary', 4.5, 'the highlight on a hero block'],
  ['accent', 'surface', 4.5, 'link / brand-as-text on a card'],
  ['accent', 'bg', 4.5, 'link / brand-as-text on the page'],
  ['text', 'primarySoft', 4.5, 'text on the soft brand tint'],
  ['success', 'successBg', 4.5, 'success text on its tint'],
  ['warning', 'warningBg', 4.5, 'warning text on its tint'],
  ['danger', 'dangerBg', 4.5, 'danger text on its tint'],
  ['info', 'infoBg', 4.5, 'info text on its tint'],
  ['offline', 'warningBg', 4.5, 'offline text on its tint'],
  // The splash wordmark sits over the far end of the gradient, not over `bg`.
  // Deepening `splashBottom` to warm the wash is exactly the kind of tweak that
  // reads as harmless and takes the tagline under the bar.
  ['accent', 'splashBottom', 4.5, 'the wordmark on the splash wash'],
  ['textMuted', 'splashBottom', 4.5, 'the tagline on the splash wash'],
];

/**
 * Non-text: "visual information required to identify a user interface
 * component", which takes the 3:1 bar.
 *
 * `primary` is in here rather than in TEXT, and that is the whole shape of the
 * v4 palette. The ember is a **fill** — a button, the active chip, the centre
 * action button, a meter, a chart line — and two of those carry meaning with no
 * label at all: a stock meter that is 18% full and a trend line climbing a
 * chart say what they say through colour and shape alone. So the ember has to
 * clear 3:1 against whatever it is drawn on, which is why `ember500` is v4's
 * `#FB6D34` walked down 6% rather than used verbatim. It is **not** asserted at
 * 4.5:1, because nothing may set type in it.
 *
 * `border` is deliberately absent: it divides a card from a card, which is
 * decoration. So is `divider`, for the same reason one step further in.
 */
const NON_TEXT: Pair[] = [
  ['borderControl', 'surface', 3, 'field edge against a card'],
  ['borderControl', 'bg', 3, 'field edge against the page'],
  ['focusRing', 'surface', 3, 'focused field edge against a card'],
  ['primary', 'surface', 3, 'brand fill (meter, chart line) on a card'],
  ['primary', 'bg', 3, 'brand fill on the page'],
];

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
])('%s palette', (_scheme, colors) => {
  it.each(TEXT)('reads %s on %s at %s:1 — %s', (fg, bg, min, _why) => {
    expect(Number(contrast(colors[fg], colors[bg]).toFixed(2))).toBeGreaterThanOrEqual(min);
  });

  it.each(NON_TEXT)('shows %s against %s at %s:1 — %s', (fg, bg, min, _why) => {
    expect(Number(contrast(colors[fg], colors[bg]).toFixed(2))).toBeGreaterThanOrEqual(min);
  });

  /**
   * `primary` is a **fill** — what a button is painted with — and `accent` is
   * the brand as text or as an icon. This asserts the two have not been quietly
   * collapsed into one value.
   *
   * The margin between them is a rescue again, as it was under the pre-v4
   * orange and unlike the brown draft that briefly replaced it: `primary` is
   * 3.2:1 on a card, so a link or a glyph painted with it is not readable and
   * `accent` is the legible substitute. The second assertion is the one that
   * matters — whichever of the two a component reaches for **as text**, only
   * one of them can be right, and it is always the more readable one.
   *
   * In light, `accent` happens to equal `text`. That is v4's own design (it
   * carries link-ness with weight, never with hue) and the assertion still
   * holds; see the note on the token in `colors.ts`.
   */
  it('keeps a brand fill and a readable brand mark, and they are not the same', () => {
    expect(colors.accent).not.toBe(colors.primary);
    expect(contrast(colors.accent, colors.surface)).toBeGreaterThan(
      contrast(colors.primary, colors.surface),
    );
  });

  /**
   * The ember is legible as a fill in **both** schemes, which is what lets
   * `primary` be one value across them.
   *
   * The brown draft could not do this — `#6B4226` on a near-black card is
   * 1.6:1 — and had to invert its primary in dark, so light and dark shipped
   * different brand fills. This is the test that fails if someone re-introduces
   * a scheme-specific primary that only works on one of the two.
   */
  it('paints a brand fill that survives on this scheme', () => {
    expect(contrast(colors.primary, colors.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * The chart ramp is asserted for **separation**, not for identification, and
   * the difference is the reason it is not held to 3:1.
   *
   * v4's ramp is a single warm hue in five steps (`#FB6D34` → `#8A5A33` →
   * `#A8763F` → `#C29A63` → `#FCE0D2`). Its fourth step is 2.59:1 on a card,
   * and darkening it to clear 3:1 puts it 1.3:1 from the step above — so
   * enforcing the non-text bar on a monochrome ramp does not make the chart
   * more readable, it makes two of its series the same colour. That is the
   * worse failure.
   *
   * The bar does not apply here anyway, because **no series in this app is
   * identified by its colour**. v4 labels every one of them in place: a
   * top-products row carries the product name and the unit count on the same
   * line as its bar, and a share bar carries a named legend. Colour is
   * redundant encoding (WCAG 1.4.1 satisfied by the label, 1.4.11 not engaged
   * because the graphic is not required to understand the content). Any chart
   * added later must keep that property — a legend-only chart would need a real
   * categorical palette, not this ramp.
   *
   * What is asserted is that no two adjacent segments of a stacked bar collapse
   * into one shape, and that no value is repeated.
   */
  it('draws a chart ramp whose steps stay apart', () => {
    expect(new Set(colors.series).size).toBe(colors.series.length);
    for (let i = 0; i < colors.series.length - 1; i += 1) {
      const [a, b] = [colors.series[i]!, colors.series[i + 1]!];
      expect(Number(contrast(a, b).toFixed(2))).toBeGreaterThanOrEqual(1.3);
    }
    // The head of the ramp is the brand fill, so it carries the fill bar.
    expect(contrast(colors.series[0], colors.surface)).toBeGreaterThanOrEqual(3);
  });
});

/**
 * The selectable accents.
 *
 * The swatch row in Settings offers five brand fills, and a preference must not
 * be a way to opt out of legibility. Every one is held to the same two bars the
 * default is: a fill readable as a graphical object, and a label readable on it.
 *
 * This is what stops a sixth swatch being added by eye. v4's own brief offers
 * `#3E1B00` as a swatch while simultaneously stating that text on the fill is
 * `#3E1B00` — ink on ink, 1.00:1, an invisible button label — so the set as
 * given does not survive its own rule. `onPrimary` is carried per accent for
 * exactly that reason, and the second assertion here is what catches it.
 */
describe.each(ACCENT_KEYS)('the %s accent', key => {
  describe.each([
    ['light', lightColorsFor(key)],
    ['dark', darkColorsFor(key)],
  ] as const)('in %s', (_scheme, colors) => {
    it('paints a fill that carries information on this scheme', () => {
      // WCAG 1.4.11 — the fill paints the meter and the trend line, which are
      // graphics with no label to fall back on.
      expect(contrast(colors.primary, colors.surface)).toBeGreaterThanOrEqual(3);
      expect(contrast(colors.primary, colors.bg)).toBeGreaterThanOrEqual(3);
    });

    it('carries a label that can be read on that fill', () => {
      expect(contrast(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(4.5);
    });

    /**
     * Weaker than the default palette's strict `>`, and only because of one
     * swatch: choosing Ink makes the fill *be* the mark, so the two coincide at
     * equality rather than one outranking the other. What still must never
     * happen is `primary` being the more readable of the two — that is the
     * ordering the fill/mark split depends on, and it holds for all five.
     */
    it('never makes the fill more readable than the mark', () => {
      expect(contrast(colors.accent, colors.surface)).toBeGreaterThanOrEqual(
        contrast(colors.primary, colors.surface),
      );
    });
  });
});

/** Choosing the default must be indistinguishable from never having chosen. */
describe('the default accent', () => {
  it('returns the base maps by identity, not a copy', () => {
    expect(lightColorsFor(DEFAULT_ACCENT)).toBe(lightColors);
    expect(darkColorsFor(DEFAULT_ACCENT)).toBe(darkColors);
  });
});
