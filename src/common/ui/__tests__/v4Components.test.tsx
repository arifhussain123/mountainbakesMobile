import React from 'react';
import { render } from '@testing-library/react-native';

import {
  MBHeroCard,
  MBLedgerTable,
  MBListCard,
  MBListRow,
  MBMeter,
  MBStackedBar,
  MBStatusTag,
} from '@/common/ui';
import { ThemeProvider } from '@/common/theme/ThemeProvider';

/**
 * The v4 component set, pinned where it makes a **judgement** rather than where
 * it draws a box.
 *
 * Nothing here asserts a colour or a padding — `contrast.test.ts` owns the
 * palette and `check-theme-tokens.sh` owns the literals. What is worth a test is
 * the handful of places these components decide something on the caller's
 * behalf, because each of those decisions is one somebody will otherwise make
 * differently at a call site:
 *
 *   - a zero and an absence are drawn differently, everywhere
 *   - a whole card is one accessibility node, not a scatter of figures
 *   - a chart's tail is folded rather than dropped
 */

function draw(ui: React.ReactElement) {
  return render(<ThemeProvider mode="light">{ui}</ThemeProvider>);
}

/**
 * A meter that is doing its job is **hidden from the accessibility tree**, and
 * Testing Library excludes hidden elements from `getByTestId` by default. That
 * default is right for a query asking "can a user reach this"; here the question
 * is "what did it draw", which is a different one — so hidden elements are asked
 * for explicitly and their hiddenness is asserted separately.
 */
const RENDERED = { includeHiddenElements: true } as const;

describe('MBMeter', () => {
  /**
   * A meter is a picture of a number that is already on screen, so by default
   * it stays out of the reader entirely rather than repeating it as a
   * percentage nobody said.
   */
  it('is silent unless the caller gives it something to say', async () => {
    const screen = await draw(<MBMeter value={8} max={20} testID="m" />);
    const node = screen.getByTestId('m', RENDERED);
    expect(node.props.accessibilityElementsHidden).toBe(true);
    expect(node.props.accessibilityRole).toBeUndefined();
  });

  it('announces itself as a progress bar when it is the only thing reporting', async () => {
    const screen = await draw(
      <MBMeter value={8} max={20} accessibilityLabel="Milk Bread, 8 of 20" testID="m" />,
    );
    const node = screen.getByTestId('m');
    expect(node.props.accessibilityRole).toBe('progressbar');
    expect(node.props.accessibilityValue).toEqual({ min: 0, max: 20, now: 8 });
  });

  /**
   * A `max` of zero is "no reorder level set", which is not the same fact as
   * "nothing left" — and dividing by it would be `Infinity` per cent.
   */
  it('draws an empty track rather than dividing by a zero maximum', async () => {
    const screen = await draw(<MBMeter value={8} max={0} testID="m" />);
    expect(screen.getByTestId('m', RENDERED).children).toHaveLength(0);
  });

  it('draws nothing at all for a zero balance', async () => {
    const screen = await draw(<MBMeter value={0} max={20} testID="m" />);
    expect(screen.getByTestId('m', RENDERED).children).toHaveLength(0);
  });

  /** One unit left must be visibly *present*, not indistinguishable from out. */
  it('gives a non-zero balance a visible fill however small', async () => {
    const screen = await draw(<MBMeter value={1} max={500} testID="m" />);
    expect(screen.getByTestId('m', RENDERED).children).toHaveLength(1);
  });

  it('clamps rather than overflowing when the balance beats the maximum', async () => {
    const screen = await draw(<MBMeter value={90} max={20} testID="m" />);
    const fill = screen.getByTestId('m', RENDERED).children[0];
    expect(JSON.stringify((fill as { props: Record<string, unknown> }).props.style)).toContain(
      '100%',
    );
  });
});

describe('MBListRow', () => {
  /**
   * One stop, not four. Read out cell by cell a transaction row becomes
   * "#4821, Cash, 4 items, 18,400" as four unrelated announcements, and the
   * relationship between them — which is the whole row — is lost.
   */
  it('reads the whole row as one sentence', async () => {
    const screen = await draw(
      <MBListRow title="#4821" subtitle="Cash · 4 items" value="18,400" />,
    );
    expect(screen.queryByLabelText('#4821, Cash · 4 items, 18,400')).not.toBeNull();
  });

  it('puts a rank at the front of what it says', async () => {
    const screen = await draw(<MBListRow rank={2} title="Butter Croissant" value="228" />);
    expect(screen.queryByLabelText('2., Butter Croissant, 228')).not.toBeNull();
  });

  it('folds a status tag into the same sentence', async () => {
    const screen = await draw(
      <MBListRow title="EXP-000012" subtitle="Transport" tag={{ label: 'Unsynced' }} />,
    );
    expect(screen.queryByLabelText('EXP-000012, Transport, Unsynced')).not.toBeNull();
  });

  /** A row that goes somewhere is a button; one that does not is not. */
  it('becomes a button only when it has somewhere to go', async () => {
    const inert = await draw(<MBListRow title="Cash" value="312,400" />);
    expect(inert.queryByRole('button')).toBeNull();

    const linked = await draw(<MBListRow title="Daily sales" onPress={() => {}} />);
    expect(linked.queryByRole('button')).not.toBeNull();
  });
});

describe('MBListCard', () => {
  /**
   * `React.Children.toArray` drops the `null` a conditional row renders, so a
   * hidden row cannot leave a rule with nothing under it.
   */
  it('ignores a row that rendered nothing', async () => {
    const screen = await draw(
      <MBListCard testID="card">
        <MBListRow title="Cash" />
        {null}
        <MBListRow title="Card" />
      </MBListCard>,
    );
    expect(screen.getByTestId('card').children).toHaveLength(2);
  });
});

describe('MBHeroCard', () => {
  /**
   * The block is one node carrying a sentence. Its supporting figures are
   * qualifiers of the headline, and read out separately they become unrelated
   * numbers with no indication that they are parts of the figure above.
   */
  it('speaks as one block, headline and qualifiers together', async () => {
    const screen = await draw(
      <MBHeroCard
        caption="Today · gross sales"
        value={486200}
        stats={[{ label: 'Sales', value: '42' }]}
        highlight="Margin 29.4%"
        testID="hero"
      />,
    );
    expect(
      screen.queryByLabelText('Today · gross sales, 486200, Sales 42, Margin 29.4%'),
    ).not.toBeNull();
  });

  it('renders a count without a currency symbol when asked', async () => {
    const screen = await draw(<MBHeroCard caption="Returned today" value="36 units" currency={false} />);
    expect(screen.queryByText('36 units')).not.toBeNull();
  });
});

describe('MBStackedBar', () => {
  /**
   * The tail is folded, not dropped. A share bar built from the top four alone
   * makes those four look like the entire business; folding keeps the bar
   * adding up to the whole.
   */
  it('folds everything past the named segments into one band', async () => {
    const screen = await draw(
      <MBStackedBar
        segments={[
          { label: 'A', value: 40 },
          { label: 'B', value: 30 },
          { label: 'C', value: 20 },
          { label: 'D', value: 5 },
          { label: 'E', value: 3 },
          { label: 'F', value: 2 },
        ]}
        accessibilityLabel="share"
      />,
    );
    expect(screen.queryByText('A')).not.toBeNull();
    expect(screen.queryByText('D')).not.toBeNull();
    // E and F are inside the fold, and the fold is named.
    expect(screen.queryByText('E')).toBeNull();
    expect(screen.queryByText('Others')).not.toBeNull();
  });

  it('renders nothing when every segment is zero', async () => {
    const screen = await draw(
      <MBStackedBar
        segments={[{ label: 'A', value: 0 }]}
        accessibilityLabel="share"
        testID="bar"
      />,
    );
    expect(screen.queryByTestId('bar')).toBeNull();
  });

  it('omits the fold when nothing is left over', async () => {
    const screen = await draw(
      <MBStackedBar
        segments={[
          { label: 'A', value: 1 },
          { label: 'B', value: 1 },
        ]}
        accessibilityLabel="share"
      />,
    );
    expect(screen.queryByText('Others')).toBeNull();
  });
});

describe('MBLedgerTable', () => {
  /**
   * An em dash, not a blank. "Nothing happened" and "we have no figure" look
   * identical when both are empty, and only one of them reconciles.
   */
  it('marks a missing cell rather than leaving a hole in the column', async () => {
    const screen = await draw(
      <MBLedgerTable
        columns={[
          { key: 'a', title: 'Prev' },
          { key: 'b', title: 'New' },
        ]}
        rows={[{ key: 'r', cells: [{ value: '102' }] }]}
      />,
    );
    expect(screen.queryByText('—')).not.toBeNull();
  });

  it('prints a row heading above its cells rather than as a column', async () => {
    const screen = await draw(
      <MBLedgerTable
        columns={[{ key: 'a', title: 'Prev' }]}
        rows={[{ key: 'r', heading: 'Fri 21 Aug', cells: [{ value: '102' }] }]}
      />,
    );
    expect(screen.queryByText('Fri 21 Aug')).not.toBeNull();
    expect(screen.queryByText('PREV')).not.toBeNull();
  });
});

describe('MBStatusTag', () => {
  /** Status is a word first. A tag with no label is not a status. */
  it('always prints the word', async () => {
    const screen = await draw(<MBStatusTag label="Pending" status="pending" />);
    expect(screen.queryByText('Pending')).not.toBeNull();
  });

  /**
   * A status the app has not been taught about still renders its word. Falling
   * back beats throwing on a value the server added this morning.
   */
  it('survives a status with no colour of its own', async () => {
    const screen = await draw(<MBStatusTag label="Unsynced" />);
    expect(screen.queryByText('Unsynced')).not.toBeNull();
  });
});
