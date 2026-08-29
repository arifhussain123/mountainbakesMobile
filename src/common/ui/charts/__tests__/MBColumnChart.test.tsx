import React from 'react';
import { MBColumnChart, type ColumnGroup } from '@/common/ui/charts/MBColumnChart';
import { renderScreen } from '@/common/test-utils/render';

/**
 * The axis under these columns says *which* bucket and never *how much*, so the
 * peak caption is the only thing on the chart carrying a unit. These cases are
 * about the ways it can lie: quoting a figure the columns were not scaled
 * against, and putting a scale on a period that never traded.
 */

const LABEL = 'Sales by hour';
const money = (v: number) => `Rs. ${v}`;

function groups(...values: number[][]): ColumnGroup[] {
  return values.map((vs, i) => ({ label: String(i), values: vs }));
}

describe('MBColumnChart peak caption', () => {
  it('says nothing when no formatter is given', async () => {
    const screen = await renderScreen(
      <MBColumnChart series={['Sales']} groups={groups([400])} accessibilityLabel={LABEL} />,
    );
    expect(screen.queryByText(/Peak/)).toBeNull();
  });

  it('states what the tallest column is worth', async () => {
    const screen = await renderScreen(
      <MBColumnChart
        series={['Sales']}
        groups={groups([50], [400], [120])}
        accessibilityLabel={LABEL}
        formatValue={money}
      />,
    );
    expect(screen.getByText('Peak Rs. 400')).toBeTruthy();
  });

  /**
   * The scale is the maximum across BOTH series, because both are drawn against
   * one axis. A caption quoting only the first would name a ceiling the taller
   * series visibly exceeds.
   */
  it('takes the peak across every series, not just the first', async () => {
    const screen = await renderScreen(
      <MBColumnChart
        series={['Sales', 'Expenses']}
        groups={groups([100, 250], [80, 90])}
        accessibilityLabel={LABEL}
        formatValue={money}
      />,
    );
    expect(screen.getByText('Peak Rs. 250')).toBeTruthy();
  });

  /**
   * Non-finite and negative values are clamped before scaling, so the caption
   * has to read the clamped maximum — otherwise it names a figure no column is
   * drawn at.
   */
  it('quotes the clamped maximum the columns were scaled against', async () => {
    const screen = await renderScreen(
      <MBColumnChart
        series={['Sales']}
        groups={groups([300], [Number.NaN], [-900])}
        accessibilityLabel={LABEL}
        formatValue={money}
      />,
    );
    expect(screen.getByText('Peak Rs. 300')).toBeTruthy();
  });

  /**
   * Every column is the two-percent stub when nothing traded, so there is no
   * tallest one for a figure to describe. "Peak Rs. 0" states a scale that was
   * never applied.
   */
  it('states no scale for a period that did not trade', async () => {
    const screen = await renderScreen(
      <MBColumnChart
        series={['Sales']}
        groups={groups([0], [0])}
        accessibilityLabel={LABEL}
        formatValue={money}
      />,
    );
    expect(screen.queryByText(/Peak/)).toBeNull();
  });

  /** The caption shares its row with the legend rather than costing a line. */
  it('draws the legend and the peak together on a two-series chart', async () => {
    const screen = await renderScreen(
      <MBColumnChart
        series={['Sales', 'Expenses']}
        groups={groups([100, 40])}
        accessibilityLabel={LABEL}
        formatValue={money}
      />,
    );
    expect(screen.getByText('Sales')).toBeTruthy();
    expect(screen.getByText('Expenses')).toBeTruthy();
    expect(screen.getByText('Peak Rs. 100')).toBeTruthy();
  });

  /** The columns stay one accessibility node; the caption is text of its own. */
  it('leaves the caption outside the chart’s own summary', async () => {
    const screen = await renderScreen(
      <MBColumnChart
        series={['Sales']}
        groups={groups([400])}
        accessibilityLabel={LABEL}
        formatValue={money}
      />,
    );
    expect(screen.getByLabelText(LABEL)).toBeTruthy();
    expect(screen.getByText('Peak Rs. 400')).toBeTruthy();
  });

  it('renders nothing at all with no groups', async () => {
    const screen = await renderScreen(
      <MBColumnChart
        series={['Sales']}
        groups={[]}
        accessibilityLabel={LABEL}
        formatValue={money}
      />,
    );
    expect(screen.queryByText(/Peak/)).toBeNull();
    expect(screen.queryByLabelText(LABEL)).toBeNull();
  });
});
