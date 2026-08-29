import {
  DEFAULT_TYPEFACE,
  TYPEFACES,
  TYPEFACE_KEYS,
  familiesFor,
  fontFamily,
  type,
  typeFor,
  typefaceFor,
} from '../typography';
import { themeFor } from '../themes';

/**
 * The selectable typeface, pinned where it makes a judgement.
 *
 * The scale itself — sizes, line heights, weights — is not asserted here; it is
 * a design, and a test that restated it would just be the file twice. What is
 * worth pinning is the small set of decisions that are easy to undo by accident
 * and silent when they break.
 */

describe('typeFor', () => {
  it('returns the base scale BY IDENTITY for the default face', () => {
    // Not merely equal. The scale goes on the theme, the theme is a context
    // value, and a fresh object for the unchanged case re-renders every consumer
    // on any provider re-evaluation. Same rule `withAccent` follows for colours.
    expect(typeFor(DEFAULT_TYPEFACE)).toBe(type);
  });

  it('moves the display AND the body family, because a face is a whole mood', () => {
    // v6 pairs a UI face with a display face, and for the alternates they are
    // the same family — picking Baskerville means the serif goes away, it does
    // not mean Playfair stays on beside it.
    const scale = typeFor('baskerville');
    const face = TYPEFACES.baskerville;

    expect(scale.display.fontFamily).toBe(face.display);
    expect(scale.h1.fontFamily).toBe(face.body);
    expect(scale.body.fontFamily).toBe(face.body);
  });

  it('leaves the mono family alone whatever the face', () => {
    // v6 has no monospace — the choice says nothing about what an order number
    // should be set in, and swapping it puts a voucher number in a serif.
    for (const key of TYPEFACE_KEYS) {
      expect(typeFor(key).mono.fontFamily).toBe(fontFamily.mono);
    }
  });

  it('keeps every non-family property of each token', () => {
    // The swap must not become a second literal copy of the scale: that is how
    // a 15pt body becomes 15.5 on one face and nobody notices for a year.
    const base = type.money;
    const swapped = typeFor('grotesk').money;

    expect(swapped.fontSize).toBe(base.fontSize);
    expect(swapped.lineHeight).toBe(base.lineHeight);
    expect(swapped.fontWeight).toBe(base.fontWeight);
    expect(swapped.fontVariant).toEqual(base.fontVariant);
  });
});

describe('familiesFor', () => {
  it('reports the chosen face, with mono held back', () => {
    const families = familiesFor('grotesk');
    expect(families.body).toBe(TYPEFACES.grotesk.body);
    expect(families.display).toBe(TYPEFACES.grotesk.display);
    expect(families.mono).toBe(fontFamily.mono);
  });

  it('returns the default map by identity for the default face', () => {
    expect(familiesFor(DEFAULT_TYPEFACE)).toBe(fontFamily);
  });
});

describe('typefaceFor', () => {
  it('never throws on a stored value that is no longer a face', () => {
    // The key comes out of MMKV, which can hold anything a previous build wrote.
    expect(typefaceFor('helvetica')).toBe(TYPEFACES[DEFAULT_TYPEFACE]);
    expect(typefaceFor(undefined)).toBe(TYPEFACES[DEFAULT_TYPEFACE]);
    expect(typefaceFor(7)).toBe(TYPEFACES[DEFAULT_TYPEFACE]);
  });
});

describe('themeFor', () => {
  it('returns the shared theme when both preferences are at their default', () => {
    expect(themeFor('light')).toBe(themeFor('light', undefined, undefined));
    expect(themeFor('light').type).toBe(type);
  });

  it('applies the face without touching the colours', () => {
    // Two independent controls. v6 exposes accent and typeface separately and
    // neither reaches into the other's tokens.
    const base = themeFor('light');
    const grotesk = themeFor('light', undefined, 'grotesk');

    expect(grotesk.colors).toBe(base.colors);
    expect(grotesk.type.body.fontFamily).toBe(TYPEFACES.grotesk.body);
  });

  it('applies the accent without touching the scale', () => {
    const base = themeFor('light');
    const plum = themeFor('light', 'plum');

    expect(plum.type).toBe(base.type);
    expect(plum.colors.primary).not.toBe(base.colors.primary);
  });

  it('carries the family map alongside the scale, for styles built outside a hook', () => {
    expect(themeFor('light', undefined, 'baskerville').fontFamily.body).toBe(
      TYPEFACES.baskerville.body,
    );
  });
});

describe('the typeface list', () => {
  it('names a note for every face, because two of them behave differently', () => {
    // Space Grotesk has no italic and neither alternate has an 800. A user finds
    // that out as a bug unless the picker says so first.
    for (const key of TYPEFACE_KEYS) {
      expect(TYPEFACES[key].note.length).toBeGreaterThan(0);
      expect(TYPEFACES[key].label.length).toBeGreaterThan(0);
    }
  });
});
