import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { renderScreen } from '@/common/test-utils/render';

import { ReceiptPreview } from '../ReceiptPreview';

/**
 * The paper, on screen.
 *
 * The behaviour worth pinning is the **measurement**: the type size comes from
 * a laid-out probe rather than a constant, so a receipt cannot be drawn at a
 * scale where 48 columns do not fit — which would show the cashier a wrap the
 * printer will not make. Under Jest `onLayout` never fires on its own, so the
 * tests drive it, which also makes the not-yet-measured state observable.
 */

const LINES = [
  'MOUNTAIN BAKES',
  '-'.repeat(48),
  `GRAND TOTAL${' '.repeat(26)}Rs. 3,439.8`,
  '',
  'Amounts as recorded by the server.',
];

/**
 * Lay the paper out at 288pt with a 0.6em advance — IBM Plex Mono's real
 * metric, which puts the resulting size at exactly 10pt for 48 columns.
 *
 * Both events are awaited. `fireEvent` is async in this version of RNTL, and an
 * un-awaited one returns before the state it set has been committed — so the
 * assertion runs against the frame before the measurement and the receipt looks
 * as though it never rendered.
 */
async function measure(
  screen: Awaited<ReturnType<typeof renderScreen>>,
  paperWidth = 288,
): Promise<void> {
  // `includeHiddenElements`: the probe is hidden from accessibility on purpose
  // — it is a measuring stick, not content — and RNTL's queries skip such
  // elements by default.
  await fireEvent(
    screen.getByTestId('receipt-mono-probe', { includeHiddenElements: true }),
    'layout',
    { nativeEvent: { layout: { width: 60, height: 100, x: 0, y: 0 } } },
  );
  await fireEvent(screen.getByTestId('receipt-paper'), 'layout', {
    nativeEvent: { layout: { width: paperWidth, height: 400, x: 0, y: 0 } },
  });
}

function noop(): void {}

describe('ReceiptPreview', () => {
  it('draws nothing until it has measured the face it will draw with', async () => {
    // Half a frame of blank paper beats a frame at the wrong size, which reads
    // as a receipt that is genuinely laid out badly.
    const screen = await renderScreen(
      <ReceiptPreview lines={LINES} columns={48} onPrint={noop} onCancel={noop} />,
    );

    expect(screen.queryByText('MOUNTAIN BAKES')).toBeNull();
  });

  it('draws every line once measured, blank ones included', async () => {
    const screen = await renderScreen(
      <ReceiptPreview lines={LINES} columns={48} onPrint={noop} onCancel={noop} />,
    );

    await measure(screen);

    expect(screen.getByText('MOUNTAIN BAKES')).toBeTruthy();
    expect(screen.getByText(LINES[2] as string)).toBeTruthy();
    // A blank line still occupies one, or the receipt closes up where the paper
    // would have space. It renders as a single space rather than nothing.
    expect(screen.getAllByText(' ')).toHaveLength(1);
  });

  /**
   * The padding is the layout. If the preview trimmed or re-flowed it, the one
   * thing this screen is for — showing where the columns land — would be the
   * thing it got wrong.
   */
  it('shows the padded totals row exactly as it will print', async () => {
    const screen = await renderScreen(
      <ReceiptPreview lines={LINES} columns={48} onPrint={noop} onCancel={noop} />,
    );

    await measure(screen);

    const total = screen.getByText(/^GRAND TOTAL/);
    expect(total.props.children).toHaveLength(48);
  });

  it('scales the type so the profile width fits the paper it was given', async () => {
    const screen = await renderScreen(
      <ReceiptPreview lines={LINES} columns={48} onPrint={noop} onCancel={noop} />,
    );

    await measure(screen, 288);

    // 288 / (48 columns x 0.6 advance) = 10. `toBeCloseTo`, because 60/100
    // is not exact in binary and the size is passed to the renderer as-is —
    // rounding it here would only hide that from the test, not from Android.
    const style = screen.getByText('MOUNTAIN BAKES').props.style;
    expect(flatten(style).fontSize).toBeCloseTo(10, 6);
  });

  it('never shrinks past legibility, however narrow the phone', async () => {
    // A 120pt paper would want 4.2pt type. The clamp holds it at 7 and lets the
    // line run over rather than printing something nobody can read on screen.
    const screen = await renderScreen(
      <ReceiptPreview lines={LINES} columns={48} onPrint={noop} onCancel={noop} />,
    );

    await measure(screen, 120);

    expect(flatten(screen.getByText('MOUNTAIN BAKES').props.style).fontSize).toBe(7);
  });

  it('says how wide the line is, and that nothing has printed yet', async () => {
    const screen = await renderScreen(
      <ReceiptPreview lines={LINES} columns={48} onPrint={noop} onCancel={noop} />,
    );

    expect(screen.getByText(/48 characters to the line/)).toBeTruthy();
    expect(screen.getByText(/Nothing here is on paper yet/)).toBeTruthy();
  });

  it('reports both decisions to its caller', async () => {
    const onPrint = jest.fn();
    const onCancel = jest.fn();
    const screen = await renderScreen(
      <ReceiptPreview lines={LINES} columns={48} onPrint={onPrint} onCancel={onCancel} />,
    );

    await fireEvent.press(screen.getByTestId('receipt-preview-print'));
    expect(onPrint).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('receipt-preview-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('blocks both while a print is in flight', async () => {
    // Cancel included: dismissing the sheet mid-write would leave the socket
    // finishing a receipt for a screen that has gone.
    const onPrint = jest.fn();
    const onCancel = jest.fn();
    const screen = await renderScreen(
      <ReceiptPreview lines={LINES} columns={48} busy onPrint={onPrint} onCancel={onCancel} />,
    );

    await fireEvent.press(screen.getByTestId('receipt-preview-print'));
    await fireEvent.press(screen.getByTestId('receipt-preview-cancel'));

    expect(onPrint).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});

/** RN styles arrive as a nested array; flatten to read one property off them. */
function flatten(style: unknown): { fontSize?: number } {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten));
  return (style ?? {}) as { fontSize?: number };
}
