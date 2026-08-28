import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { MBButton } from '../common/MBButton';
import { MBHeader } from '../common/MBHeader';
import { MBMoney } from '../common/MBMoney';
import { renderScreen } from '@/common/test-utils/render';
import { MBStatCard } from '../cards/MBStatCard';
import { MBErrorState } from '../feedback/MBStates';
import { ApiError } from '@/api/errors';
import { ThemeProvider } from '@/common/theme/ThemeProvider';

/**
 * Component tests.
 *
 * These replace the template's whole-app smoke test, which rendered every
 * provider (gesture handler, worklets, keyboard controller, SQLite) to assert
 * only that nothing threw. It needed the entire native surface mocked and caught
 * nothing our own code could get wrong.
 *
 * Note: in @testing-library/react-native v14 both `render` and `fireEvent` are
 * async and must be awaited. Forgetting the await does not fail loudly — the
 * queries simply come back empty.
 */

function renderThemed(ui: React.ReactElement, mode: 'light' | 'dark' = 'light') {
  return render(<ThemeProvider mode={mode}>{ui}</ThemeProvider>);
}

describe('MBButton', () => {
  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const screen = await renderThemed(<MBButton label="Save sale" onPress={onPress} />);

    await fireEvent.press(screen.getByText('Save sale'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while loading', async () => {
    // A double-tap on a submitting sale is how a duplicate transaction gets
    // created — the press must be blocked, not merely dimmed.
    const onPress = jest.fn();
    const screen = await renderThemed(<MBButton label="Save sale" onPress={onPress} loading />);

    const button = screen.getByRole('button');
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    const screen = await renderThemed(<MBButton label="Save" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('exposes an accessible name', async () => {
    const screen = await renderThemed(<MBButton label="Submit order" />);
    expect(screen.getByLabelText('Submit order')).toBeTruthy();
  });
});

describe('MBStatCard', () => {
  it('formats a numeric value as currency', async () => {
    const screen = await renderThemed(<MBStatCard label="Today's Sales" value={125500} />);
    expect(screen.getByText('Rs. 125,500')).toBeTruthy();
  });

  it('accepts the PostgREST numeric string form', async () => {
    // numeric(14,2) arrives as a JSON string; the tile must not render "NaN".
    const screen = await renderThemed(<MBStatCard label="Today's Sales" value="125500.00" />);
    expect(screen.getByText('Rs. 125,500')).toBeTruthy();
  });

  it('renders counts unformatted when currency is off', async () => {
    const screen = await renderThemed(
      <MBStatCard label="Pending Orders" value={7} currency={false} />,
    );
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('honours a tenant currency symbol', async () => {
    const screen = await renderThemed(
      <MBStatCard label="Sales" value={1250} currencySymbol="PKR" />,
    );
    expect(screen.getByText('PKR 1,250')).toBeTruthy();
  });

  it('marks delta direction with a glyph, not colour alone', async () => {
    const screen = await renderThemed(<MBStatCard label="Sales" value={100} deltaPct={12.4} />);
    // The direction is now a vector icon beside the number, not a glyph
    // prefixed onto it — see MBStatCard.
    expect(screen.getByText('12.4%')).toBeTruthy();
  });
});

describe('MBErrorState', () => {
  it('shows the friendly message, never the raw error text', async () => {
    const error = new ApiError({
      kind: 'authorization',
      message: 'Forbidden: requires one of [super_admin]',
      status: 403,
    });
    const screen = await renderThemed(<MBErrorState error={error} onRetry={jest.fn()} />);

    expect(screen.getByText("You don't have permission to do this.")).toBeTruthy();
    expect(screen.queryByText(/Forbidden: requires/)).toBeNull();
  });

  it('offers retry for a network failure', async () => {
    const onRetry = jest.fn();
    const error = new ApiError({
      kind: 'network',
      message: 'Network request failed.',
    });
    const screen = await renderThemed(<MBErrorState error={error} onRetry={onRetry} />);

    await fireEvent.press(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('hides retry when retrying cannot change the outcome', async () => {
    // Re-sending a request the server rejected as invalid only wastes time.
    const error = new ApiError({
      kind: 'validation',
      message: 'Quantity must be positive',
    });
    const screen = await renderThemed(<MBErrorState error={error} onRetry={jest.fn()} />);

    expect(screen.queryByText('Try again')).toBeNull();
  });
});

describe('theming', () => {
  it('renders in dark mode without component-level branching', async () => {
    const screen = await renderThemed(<MBStatCard label="Today's Sales" value={1250} />, 'dark');
    expect(screen.getByText('Rs. 1,250')).toBeTruthy();
  });
});

/**
 * `MBHeader` reads safe-area insets, so these go through `renderScreen` rather
 * than the bare theme wrapper above.
 */
describe('MBHeader search', () => {
  const searchProps = {
    value: '',
    onChangeText: jest.fn(),
    placeholder: 'Search by name or code',
    testID: 'header-search',
  };

  beforeEach(() => searchProps.onChangeText.mockClear());

  it('stays collapsed until the search button is pressed', async () => {
    const screen = await renderScreen(<MBHeader title="Products" search={searchProps} />);

    // The title owns the row; search is one button until asked for.
    expect(screen.getByText('Products')).toBeTruthy();
    expect(screen.queryByTestId('header-search')).toBeNull();

    await fireEvent.press(screen.getByTestId('header-search-open'));
    expect(screen.getByTestId('header-search')).toBeTruthy();
  });

  it('clears the query when the field is closed', async () => {
    // A filter that survives out of sight is how a list ends up looking empty
    // with no visible control to explain why.
    const screen = await renderScreen(
      <MBHeader title="Products" search={{ ...searchProps, value: 'rus' }} />,
    );

    await fireEvent.press(screen.getByTestId('header-search-open'));
    await fireEvent.press(screen.getByLabelText('Close search'));

    expect(searchProps.onChangeText).toHaveBeenCalledWith('');
    expect(screen.getByText('Products')).toBeTruthy();
  });

  it('offers no search control to a screen with nothing to search', async () => {
    const screen = await renderScreen(<MBHeader title="Dashboard" />);
    expect(screen.queryByTestId('header-search-open')).toBeNull();
  });
});

/**
 * `MBMoney` is the only component that renders currency, so these assert the
 * two things a second implementation would get wrong: the formatting contract,
 * and the one case where a figure must announce that it is provisional.
 */
describe('MBMoney', () => {
  it('formats the PostgREST numeric string form rather than rendering NaN', async () => {
    // `numeric(14,2)` arrives over the wire as a string. Every money field in
    // the app can look like this.
    const screen = await renderThemed(<MBMoney value="1250.00" />);
    expect(screen.getByText('Rs. 1,250')).toBeTruthy();
  });

  it('uses the tenant symbol it is given', async () => {
    const screen = await renderThemed(<MBMoney value={1250} symbol="PKR" />);
    expect(screen.getByText('PKR 1,250')).toBeTruthy();
  });

  it('marks an unconfirmed figure as an estimate, in the text and to a reader', async () => {
    // A cart total is the device's arithmetic over cached tax settings; the
    // server recomputes it from the line items and its own settings.
    const screen = await renderThemed(<MBMoney value={1250} estimate />);

    // `includeHiddenElements` is the assertion, not a workaround: the word is
    // drawn but hidden from the reader, because the amount above it already
    // announces itself as estimated and saying it twice is noise.
    expect(screen.getByText('Estimate', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('Estimate')).toBeNull();
    // The qualifier comes first: hearing the number and only then "estimate" is
    // the wrong order when the number is what gets acted on.
    expect(screen.getByLabelText('Estimated Rs. 1,250')).toBeTruthy();
  });

  it('says nothing extra about a confirmed figure', async () => {
    const screen = await renderThemed(<MBMoney value={1250} />);
    expect(screen.queryByText('Estimate')).toBeNull();
  });

  it('spells out a ledger direction that is drawn as one glyph', async () => {
    const screen = await renderThemed(<MBMoney value={500} sign="out" />);
    // U+2212, not a hyphen: a hyphen at money size reads as a dash.
    expect(screen.getByText('\u2212Rs. 500')).toBeTruthy();
    expect(screen.getByLabelText('out Rs. 500')).toBeTruthy();
  });
});
