import React from 'react';
import { render } from '@testing-library/react-native';

import { MBBadge } from '../MBBadge';
import { ThemeProvider } from '@/common/theme/ThemeProvider';

/**
 * Badge behaviour.
 *
 * The contract being pinned here is **self-clearing**, which is what makes a
 * badge worth believing: it is derived from live store state and renders
 * nothing once that state is empty. A badge that lingers at zero, or shows a
 * number nobody can reconcile, teaches staff to ignore every badge in the app —
 * including the one that matters.
 */

function renderBadge(ui: React.ReactElement) {
  return render(<ThemeProvider mode="light">{ui}</ThemeProvider>);
}

describe('MBBadge', () => {
  it('renders nothing at zero, so it clears itself with the state behind it', async () => {
    const screen = await renderBadge(<MBBadge count={0} label="0 waiting to sync" />);
    expect(screen.toJSON()).toBeNull();
  });

  it('renders nothing for a negative count rather than a minus sign', async () => {
    const screen = await renderBadge(<MBBadge count={-1} label="broken" />);
    expect(screen.toJSON()).toBeNull();
  });

  it('shows the exact count while it still fits', async () => {
    const screen = await renderBadge(<MBBadge count={3} label="3 waiting to sync" />);
    expect(screen.queryByText('3')).not.toBeNull();
  });

  it('caps at 99+, because the pill stops fitting the tab bar', async () => {
    const screen = await renderBadge(<MBBadge count={100} label="lots" />);
    expect(screen.queryByText('99+')).not.toBeNull();
  });

  it('announces its own count when nothing else does', async () => {
    const screen = await renderBadge(<MBBadge count={2} label="2 need attention" />);
    expect(screen.queryByLabelText('2 need attention')).not.toBeNull();
  });

  it('stays out of the reader when the surrounding control already says the count', async () => {
    // The tab announces "More, 2 waiting to sync" itself. A badge repeating the
    // number reads everything twice.
    const screen = await renderBadge(<MBBadge count={2} label="" />);

    // Hidden from the reader — RNTL's queries honour
    // `accessibilityElementsHidden`, so the default query finding nothing is
    // itself the assertion...
    expect(screen.queryByText('2')).toBeNull();
    // ...while the pill is still very much drawn on screen.
    expect(screen.queryByText('2', { includeHiddenElements: true })).not.toBeNull();
  });
});
