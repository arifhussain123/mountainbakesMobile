import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { MBAccentPicker } from '../MBAccentPicker';
import { ACCENTS, ACCENT_KEYS } from '@/common/theme/accents';
import { ThemeProvider } from '@/common/theme/ThemeProvider';

/**
 * The theme-colour swatch row.
 *
 * What is worth pinning here is not that five circles render — it is that the
 * row stays operable for someone who cannot see the colours, which is the one
 * failure mode a control made entirely of colour actually has.
 */

function renderPicker(ui: React.ReactElement) {
  return render(<ThemeProvider mode="light">{ui}</ThemeProvider>);
}

describe('MBAccentPicker', () => {
  it('offers every accent', async () => {
    const screen = await renderPicker(<MBAccentPicker value="ember" onSelect={() => {}} />);

    for (const key of ACCENT_KEYS) {
      expect(screen.getByTestId(`accent-${key}`)).toBeTruthy();
    }
  });

  it('reports the choice', async () => {
    const onSelect = jest.fn();
    const screen = await renderPicker(<MBAccentPicker value="ember" onSelect={onSelect} />);

    fireEvent.press(screen.getByTestId('accent-indigo'));

    expect(onSelect).toHaveBeenCalledWith('indigo');
  });

  /**
   * The swatch has no text and no shape of its own, so its name is the only
   * thing a screen reader can announce. Without it the row reads as five
   * identical unlabelled buttons.
   */
  it('names each swatch rather than leaving it as a bare colour', async () => {
    const screen = await renderPicker(<MBAccentPicker value="ember" onSelect={() => {}} />);

    for (const key of ACCENT_KEYS) {
      expect(screen.getByLabelText(`${ACCENTS[key].label} theme colour`)).toBeTruthy();
    }
  });

  /**
   * Selection is drawn as a ring, so `selected` is what carries it to anyone not
   * seeing the ring — and exactly one may claim it.
   */
  it('marks exactly one as selected', async () => {
    const screen = await renderPicker(<MBAccentPicker value="violet" onSelect={() => {}} />);

    const selected = ACCENT_KEYS.filter(
      key => screen.getByTestId(`accent-${key}`).props.accessibilityState?.selected,
    );

    expect(selected).toEqual(['violet']);
  });

  it('names the current choice in text, not only as a ring', async () => {
    const screen = await renderPicker(<MBAccentPicker value="emerald" onSelect={() => {}} />);
    expect(screen.getByText(ACCENTS.emerald.label)).toBeTruthy();
  });
});
