import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { MBFontPicker } from '@/common/ui';
import { TYPEFACES, TYPEFACE_KEYS } from '@/common/theme/typography';
import { ThemeProvider } from '@/common/theme/ThemeProvider';

/**
 * The typeface picker.
 *
 * One assertion here matters more than the rest: each row must be **set in the
 * face it offers**. A picker whose three options all render in the current face
 * is a radio group with three identical-looking answers, and it would pass any
 * test that only checked the labels were present.
 */

function renderPicker(ui: React.ReactElement) {
  return render(<ThemeProvider mode="light">{ui}</ThemeProvider>);
}

/** Flattens the RN style prop, which may be an array. */
function styleOf(node: { props: { style?: unknown } }): Record<string, unknown> {
  const s = node.props.style;
  const flat = Array.isArray(s) ? s.flat(Infinity) : [s];
  return Object.assign({}, ...flat.filter(Boolean));
}

describe('MBFontPicker', () => {
  it('offers every face in the list', async () => {
    const screen = await renderPicker(
      <MBFontPicker value="jakarta" onSelect={() => {}} />,
    );

    for (const key of TYPEFACE_KEYS) {
      expect(screen.getByTestId(`typeface-${key}`)).toBeTruthy();
    }
  });

  it('sets each specimen in its own family, which is the whole control', async () => {
    const screen = await renderPicker(
      <MBFontPicker value="jakarta" onSelect={() => {}} />,
    );

    for (const key of TYPEFACE_KEYS) {
      const label = screen.getByText(TYPEFACES[key].label);
      expect(styleOf(label).fontFamily).toBe(TYPEFACES[key].display);
    }
  });

  it('reports the choice', async () => {
    const onSelect = jest.fn();
    const screen = await renderPicker(
      <MBFontPicker value="jakarta" onSelect={onSelect} />,
    );

    fireEvent.press(screen.getByTestId('typeface-baskerville'));

    expect(onSelect).toHaveBeenCalledWith('baskerville');
  });

  it('stays operable for someone who cannot see the specimens', async () => {
    // The control is made of letterforms, so the accessible name has to carry
    // both which face it is and how that face differs — the note is the only
    // warning that Space Grotesk has no italic.
    const screen = await renderPicker(
      <MBFontPicker value="jakarta" onSelect={() => {}} />,
    );

    const row = screen.getByTestId('typeface-grotesk');
    expect(row.props.accessibilityLabel).toContain(TYPEFACES.grotesk.label);
    expect(row.props.accessibilityLabel).toContain(TYPEFACES.grotesk.note);
    expect(row.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false }),
    );
  });

  it('marks the selected row', async () => {
    const screen = await renderPicker(
      <MBFontPicker value="grotesk" onSelect={() => {}} />,
    );

    expect(
      screen.getByTestId('typeface-grotesk').props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(
      screen.getByTestId('typeface-jakarta').props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
  });
});
