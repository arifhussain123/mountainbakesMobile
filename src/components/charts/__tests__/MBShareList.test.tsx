import React from 'react';
import { MBShareList, type ShareItem } from '@/components/charts/MBShareList';
import { renderScreen } from '@/test-utils/render';

/**
 * Same risk as any chart: it renders something plausible for almost any input.
 * These cover the inputs that would make the bars misrepresent the figures.
 */

const LABEL = 'Top products by revenue';

async function render(items: ShareItem[]) {
  const screen = await renderScreen(<MBShareList items={items} accessibilityLabel={LABEL} />);
  return screen;
}

const item = (label: string, amount: number): ShareItem => ({
  label,
  amount,
  display: String(amount),
});

describe('MBShareList', () => {
  it('keeps the exact figure on every row', async () => {
    const screen = await render([item('Milk Rusk', 1240), item('Cake Rusk', 620)]);
    // The number is what gets written down; the bar never replaces it.
    expect(screen.getByText('1240')).toBeTruthy();
    expect(screen.getByText('620')).toBeTruthy();
    expect(screen.getByText('Milk Rusk')).toBeTruthy();
  });

  /**
   * Bars are a share of the LARGEST row, not of the total. These lists are a
   * top-N, so the remainder is missing — percentages of a partial total would
   * claim the five rows shown are the whole business.
   */
  it('scales against the largest row, so the top bar is full', async () => {
    const screen = await render([item('A', 100), item('B', 50)]);
    const widths = JSON.stringify(screen.toJSON()).match(/"width":"([\d.]+)%"/g) ?? [];
    expect(widths).toHaveLength(2);
    expect(widths[0]).toContain('100');
    expect(widths[1]).toContain('50');
  });

  /**
   * A row that sold one unit against a top seller of thousands rounds to a bar
   * of nothing, which reads as a rendering failure rather than a small share.
   */
  it('keeps a tiny share visible', async () => {
    const screen = await render([item('Huge', 10_000), item('Tiny', 1)]);
    const widths = JSON.stringify(screen.toJSON()).match(/"width":"([\d.]+)%"/g) ?? [];
    const smallest = Math.min(...widths.map(w => parseFloat(w.replace(/[^\d.]/g, ''))));
    expect(smallest).toBeGreaterThanOrEqual(2);
  });

  /**
   * Every row zero means no maximum to divide by. Unguarded that is a division
   * by zero, and NaN widths render as full-width bars — a period with no sales
   * drawn as every product selling equally well.
   */
  it('draws nothing full when every row is zero', async () => {
    const screen = await render([item('A', 0), item('B', 0)]);
    const widths = (JSON.stringify(screen.toJSON()).match(/"width":"([\d.]+)%"/g) ?? []).map(w =>
      parseFloat(w.replace(/[^\d.]/g, '')),
    );
    expect(widths).toHaveLength(2);
    expect(widths.every(w => Number.isFinite(w) && w <= 2)).toBe(true);
  });

  it('survives a non-finite amount from the API', async () => {
    const screen = await render([item('A', 100), { label: 'B', amount: NaN, display: '—' }]);
    const widths = (JSON.stringify(screen.toJSON()).match(/"width":"([\d.]+)%"/g) ?? []).map(w =>
      parseFloat(w.replace(/[^\d.]/g, '')),
    );
    expect(widths.every(Number.isFinite)).toBe(true);
  });

  it('renders nothing rather than an empty card', async () => {
    const screen = await render([]);
    // The component returns null; `toJSON()` is the test provider's root, which
    // is always present, so the assertion is on there being no bars.
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/"width":"[\d.]+%"/);
    expect(screen.queryByLabelText(LABEL)).toBeNull();
  });
});
