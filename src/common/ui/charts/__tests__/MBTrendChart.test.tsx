import React from 'react';
import { MBTrendChart, type TrendPoint } from '@/common/ui/charts/MBTrendChart';
import { renderScreen } from '@/common/test-utils/render';

/**
 * A chart is the one component that can be confidently, silently wrong: it
 * renders something plausible for almost any input. These tests are about the
 * inputs that make it lie — an empty period, a day with no sales, a period where
 * nothing sold at all, and a bad number from the API.
 */

const LABEL = 'Daily revenue';

async function renderChart(data: TrendPoint[]) {
  const screen = await renderScreen(
    <MBTrendChart data={data} accessibilityLabel={LABEL} height={120} />,
  );
  const svg = screen.queryByTestId('trend-chart', { includeHiddenElements: true });
  return { screen, svg };
}

function barHeights(svg: { props: { children?: unknown } } | null): number[] {
  if (!svg) return [];
  const out: number[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const el = node as { props?: Record<string, unknown> };
    const h = el.props?.height;
    // Bars carry a numeric height and a rounded corner; the baseline is a Line.
    if (typeof h === 'number' && el.props?.rx !== undefined) out.push(h);
    if (el.props?.children) walk(el.props.children);
  };
  walk((svg.props as { children?: unknown }).children);
  return out;
}

describe('MBTrendChart', () => {
  it('draws one bar per day', async () => {
    const { svg } = await renderChart([
      { label: '2026-08-01', value: 100 },
      { label: '2026-08-02', value: 250 },
      { label: '2026-08-03', value: 50 },
    ]);
    expect(barHeights(svg)).toHaveLength(3);
  });

  it('scales bars against the largest value, not an absolute', async () => {
    const { svg } = await renderChart([
      { label: 'a', value: 50 },
      { label: 'b', value: 100 },
    ]);
    const [a, b] = barHeights(svg);
    // The tallest bar fills the frame; half the revenue is half the height.
    expect(b).toBeGreaterThan(a!);
    expect(a! / b!).toBeCloseTo(0.5, 1);
  });

  /**
   * A closed day and a day off the end of the data must not look the same. A
   * zero-height bar would read as "no data here"; a visible stub reads as
   * "this day happened and sold nothing".
   */
  it('gives a zero day a visible stub rather than nothing', async () => {
    const { svg } = await renderChart([
      { label: 'a', value: 400 },
      { label: 'b', value: 0 },
    ]);
    const [, zero] = barHeights(svg);
    expect(zero).toBeGreaterThan(0);
  });

  /**
   * Every value zero means `max` is 0. Without a guard this divides by zero and
   * every bar becomes NaN — which React Native renders as a full-height bar, so
   * a week with no trade would draw as the best week on record.
   */
  it('does not imply trade when every day is zero', async () => {
    const { svg } = await renderChart([
      { label: 'a', value: 0 },
      { label: 'b', value: 0 },
      { label: 'c', value: 0 },
    ]);
    const heights = barHeights(svg);
    expect(heights).toHaveLength(3);
    expect(heights.every(h => Number.isFinite(h) && h <= 4)).toBe(true);
  });

  it('survives a non-finite value from the API rather than drawing NaN', async () => {
    const { svg } = await renderChart([
      { label: 'a', value: 100 },
      { label: 'b', value: Number.NaN },
    ]);
    expect(barHeights(svg).every(Number.isFinite)).toBe(true);
  });

  it('renders nothing at all for an empty period', async () => {
    const { svg } = await renderChart([]);
    expect(svg).toBeNull();
  });

  /**
   * The bars carry no text. Without a summary the whole card is silent to a
   * screen reader, so the label is required by the type and asserted here.
   */
  it('announces a summary in place of the bars', async () => {
    const screen = await renderScreen(
      <MBTrendChart data={[{ label: 'a', value: 1 }]} accessibilityLabel={LABEL} />,
    );
    expect(screen.getByLabelText(LABEL)).toBeTruthy();
  });
});

/**
 * The peak caption exists because the bars carry no axis: two charts of
 * identical shape can be a quiet week and a record one, and nothing on either
 * says which. These cases are about the two ways the caption itself can lie —
 * quoting a number the bars were not scaled against, and putting a scale on a
 * period that never traded.
 */
describe('MBTrendChart peak caption', () => {
  const money = (v: number) => `Rs. ${v}`;

  it('says nothing when no formatter is given', async () => {
    const screen = await renderScreen(
      <MBTrendChart
        data={[{ label: 'a', value: 400 }]}
        accessibilityLabel={LABEL}
      />,
    );
    expect(screen.queryByText(/Peak/)).toBeNull();
  });

  it('states what the tallest bar is worth', async () => {
    const screen = await renderScreen(
      <MBTrendChart
        data={[
          { label: 'a', value: 50 },
          { label: 'b', value: 400 },
          { label: 'c', value: 120 },
        ]}
        accessibilityLabel={LABEL}
        formatValue={money}
      />,
    );
    expect(screen.getByText('Peak Rs. 400')).toBeTruthy();
  });

  /**
   * The caption must quote the value the bars were SCALED against, not the raw
   * maximum of the input. A negative is clamped to zero before scaling, so a
   * caption reading it off the untouched array would name a figure no bar is
   * drawn at.
   */
  it('quotes the clamped maximum the bars were scaled against', async () => {
    const screen = await renderScreen(
      <MBTrendChart
        data={[
          { label: 'a', value: 300 },
          { label: 'b', value: Number.NaN },
          { label: 'c', value: -900 },
        ]}
        accessibilityLabel={LABEL}
        formatValue={money}
      />,
    );
    expect(screen.getByText('Peak Rs. 300')).toBeTruthy();
  });

  /**
   * Every bar is the stub when nothing traded, so there is no tallest bar for a
   * figure to describe. "Peak Rs. 0" states a scale that was never applied.
   */
  it('states no scale for a period that did not trade', async () => {
    const screen = await renderScreen(
      <MBTrendChart
        data={[
          { label: 'a', value: 0 },
          { label: 'b', value: 0 },
        ]}
        accessibilityLabel={LABEL}
        formatValue={money}
      />,
    );
    expect(screen.queryByText(/Peak/)).toBeNull();
  });

  /** The bars stay one accessibility node; the caption is text of its own. */
  it('leaves the caption outside the chart’s own summary', async () => {
    const screen = await renderScreen(
      <MBTrendChart
        data={[{ label: 'a', value: 400 }]}
        accessibilityLabel={LABEL}
        formatValue={money}
      />,
    );
    expect(screen.getByLabelText(LABEL)).toBeTruthy();
    expect(screen.getByText('Peak Rs. 400')).toBeTruthy();
  });
});
