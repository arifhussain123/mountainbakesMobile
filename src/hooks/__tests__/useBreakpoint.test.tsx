import React from 'react';
import { useWindowDimensions } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { MBStatGrid } from '@/components/cards/MBStatGrid';
import { MBStatCard } from '@/components/cards/MBStatCard';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { renderScreen } from '@/test-utils/render';
import { contentColumn, contentColumnWide, layout } from '@/theme/spacing';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const mockDimensions = useWindowDimensions as unknown as jest.Mock;

function atWidth(width: number) {
  mockDimensions.mockReturnValue({ width, height: 900, scale: 2, fontScale: 1 });
}

/**
 * The breakpoint is compared against **window width**, not a device class, so
 * these tests set a width rather than pretending to be a tablet. That is the
 * whole point of the design: split-screen, landscape and a foldable opening are
 * the same event, and none of them changes what device you are on.
 */
describe('useBreakpoint', () => {
  it.each([
    ['small phone', 320, false, 1],
    ['large phone portrait', 430, false, 1],
    ['just below the breakpoint', 599, false, 1],
    ['exactly the breakpoint', 600, true, 2],
    ['7-inch tablet', 800, true, 2],
    ['10-inch tablet landscape', 1280, true, 2],
  ])('treats %s (%ddp) as isWide=%s', async (_label, width, isWide, columns) => {
    atWidth(width);
    const { result } = await renderHook(() => useBreakpoint());
    expect({ isWide: result.current.isWide, columns: result.current.columns }).toEqual({
      isWide,
      columns,
    });
  });

  /**
   * A landscape phone gets the wide layout on purpose. The problem a wide window
   * creates is a measure too long to read, and a landscape phone has exactly
   * that problem — so this is width, never `isTablet`.
   */
  it('gives a landscape phone the wide layout', async () => {
    atWidth(844);
    const { result } = await renderHook(() => useBreakpoint());
    expect(result.current.isWide).toBe(true);
  });

  it('follows a rotation rather than caching the launch width', async () => {
    atWidth(400);
    const { result, rerender } = await renderHook(() => useBreakpoint());
    expect(result.current.isWide).toBe(false);

    atWidth(1024);
    await rerender({});

    expect(result.current.isWide).toBe(true);
  });
});

describe('content width caps', () => {
  /**
   * On a phone the cap already exceeds the screen, which is why it can be
   * applied unconditionally and no screen carries an `isWide ?` branch.
   */
  it('are wider than any phone, so they are a no-op below the breakpoint', () => {
    expect(contentColumn.maxWidth).toBeGreaterThan(layout.tabletMin - 1);
    expect(contentColumnWide.maxWidth).toBeGreaterThan(contentColumn.maxWidth);
  });

  it('centre the column rather than pinning it left', () => {
    expect(contentColumn.alignSelf).toBe('center');
    expect(contentColumn.width).toBe('100%');
  });
});

describe('MBStatGrid', () => {
  const tiles = (
    <>
      <MBStatCard label="A" value={1} currency={false} />
      <MBStatCard label="B" value={2} currency={false} />
      <MBStatCard label="C" value={3} currency={false} />
      <MBStatCard label="D" value={4} currency={false} />
    </>
  );

  /**
   * Two-up on a phone, four-up on a tablet. Capping the width alone would stop
   * the tiles stretching but leave a tablet showing a phone's 2x2 block adrift
   * in the middle of the screen.
   */
  it.each([
    ['phone', 400, '46%'],
    ['tablet', 1024, '22%'],
  ])('lays tiles out for a %s', async (_label, width, basis) => {
    atWidth(width);
    const screen = await renderScreen(<MBStatGrid>{tiles}</MBStatGrid>);

    const flat = (style: unknown): Record<string, unknown> =>
      Object.assign({}, ...(Array.isArray(style) ? style.flat(9) : [style]).filter(Boolean));

    const items = screen.getAllByTestId('stat-grid-item');
    expect(items).toHaveLength(4);
    expect(items.map(i => flat(i.props.style).flexBasis)).toEqual([basis, basis, basis, basis]);
  });
});
