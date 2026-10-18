/**
 * @format
 */
import { buildColors, darkColors, lightColors } from '@/shared/theme/colors';
import { ACCENT_LIST, ACCENTS, type AccentId } from '@/shared/theme/accents';

const ACCENT_IDS: AccentId[] = ['orange', 'blue', 'green', 'purple', 'rose'];

describe('buildColors', () => {
  it.each(ACCENT_IDS)('sets primary/primaryPressed/primaryText from the %s accent definition, in both modes', (id) => {
    const def = ACCENTS[id];
    for (const mode of ['light', 'dark'] as const) {
      const colors = buildColors(mode, id);
      expect(colors.primary).toBe(def.hex);
      expect(colors.primaryPressed).toBe(def.pressedHex);
      expect(colors.primaryText).toBe(def.onAccentText);
    }
  });

  it('never changes a non-accent (data/chart) token when the accent changes — charts must mean the same thing in every accent', () => {
    const base = buildColors('dark', 'orange');
    for (const id of ACCENT_IDS) {
      const colors = buildColors('dark', id);
      expect(colors.secondary).toBe(base.secondary);
      expect(colors.info).toBe(base.info);
      expect(colors.infoAlt).toBe(base.infoAlt);
      expect(colors.violet).toBe(base.violet);
      expect(colors.orange).toBe(base.orange);
      expect(colors.lavender).toBe(base.lavender);
      expect(colors.success).toBe(base.success);
      expect(colors.warning).toBe(base.warning);
      expect(colors.danger).toBe(base.danger);
    }
  });

  it('never changes background/surface/text/border tokens when only the accent changes, within one mode', () => {
    for (const mode of ['light', 'dark'] as const) {
      const base = buildColors(mode, 'orange');
      for (const id of ACCENT_IDS) {
        const colors = buildColors(mode, id);
        expect(colors.background).toBe(base.background);
        expect(colors.surface).toBe(base.surface);
        expect(colors.text).toBe(base.text);
        expect(colors.textSecondary).toBe(base.textSecondary);
        expect(colors.border).toBe(base.border);
      }
    }
  });

  it('light and dark modes have different background/text/surface tokens (not just different accents)', () => {
    const light = buildColors('light', 'orange');
    const dark = buildColors('dark', 'orange');
    expect(light.background).not.toBe(dark.background);
    expect(light.text).not.toBe(dark.text);
    expect(light.surface).not.toBe(dark.surface);
  });

  it('dark mode keeps this app\'s existing charcoal background exactly — not matched to the web\'s warm-brown dark theme', () => {
    expect(buildColors('dark', 'orange').background).toBe('#0B0C12');
  });

  it('light mode matches the web\'s own cream background/foreground/border (Step 0 conversion)', () => {
    const light = buildColors('light', 'orange');
    expect(light.background).toBe('#FDF7EA');
    expect(light.text).toBe('#1F0B03');
    expect(light.border).toBe('#E3DECF');
  });
});

describe('lightColors / darkColors (orange-default fixed exports)', () => {
  it('are the orange-accent build for their respective mode', () => {
    expect(lightColors).toEqual(buildColors('light', 'orange'));
    expect(darkColors).toEqual(buildColors('dark', 'orange'));
  });
});

describe('ACCENT_LIST', () => {
  it('has exactly the 5 accents the web offers, in the web\'s own order', () => {
    expect(ACCENT_LIST.map((a) => a.id)).toEqual(['orange', 'blue', 'green', 'purple', 'rose']);
  });

  it('every accent\'s onAccentText clears WCAG AA (>=4.5:1) contrast against its own hex', () => {
    const luminance = (hex: string): number => {
      const n = parseInt(hex.replace('#', ''), 16);
      const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (h1: string, h2: string): number => {
      const l1 = luminance(h1);
      const l2 = luminance(h2);
      const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
      return (hi + 0.05) / (lo + 0.05);
    };
    for (const def of ACCENT_LIST) {
      expect(contrast(def.hex, def.onAccentText)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
