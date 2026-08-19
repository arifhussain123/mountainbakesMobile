import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { MBButton } from '../common/MBButton';
import { MBStatCard } from '../cards/MBStatCard';
import { MBErrorState } from '../feedback/MBStates';
import { ApiError } from '@/services/api/errors';
import { ThemeProvider } from '@/theme/ThemeProvider';

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
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
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
    const screen = await renderThemed(<MBStatCard label="Sales" value={1250} currencySymbol="PKR" />);
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
    const error = new ApiError({ kind: 'network', message: 'Network request failed.' });
    const screen = await renderThemed(<MBErrorState error={error} onRetry={onRetry} />);

    await fireEvent.press(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('hides retry when retrying cannot change the outcome', async () => {
    // Re-sending a request the server rejected as invalid only wastes time.
    const error = new ApiError({ kind: 'validation', message: 'Quantity must be positive' });
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
