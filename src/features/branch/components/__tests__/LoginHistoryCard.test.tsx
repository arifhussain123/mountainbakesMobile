import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/api/services/loginHistoryService', () => ({
  getLoginHistory: jest.fn(),
}));

import { getLoginHistory } from '@/api/services/loginHistoryService';
import type { LoginSession } from '@/shared/types/login-session.types';
import { renderScreen } from '@/common/test-utils/render';
import { LoginHistoryCard, formatDuration, formatWhere } from '../LoginHistoryCard';

const fetchHistory = getLoginHistory as jest.Mock;

function session(over: Partial<LoginSession> = {}): LoginSession {
  return {
    id: 'sess-1',
    userId: 'u1',
    userEmail: 'shift@mountainbakes.pk',
    userName: 'Shift User',
    userRole: 'branch_user',
    branchId: 'b1',
    branchName: 'Committee Chowk',
    ipAddress: '203.0.113.9',
    userAgent: 'Android 13',
    country: 'Pakistan',
    countryCode: 'PK',
    city: 'Rawalpindi',
    region: 'Punjab',
    loginAt: '2026-08-28T04:10:00.000Z',
    lastSeenAt: '2026-08-28T06:40:00.000Z',
    endedAt: null,
    endReason: null,
    date: '2026-08-28',
    state: 'active',
    durationMs: 9_000_000,
    ...over,
  };
}

beforeEach(() => {
  fetchHistory.mockReset();
});

/**
 * The card's judgements, not its markup.
 *
 * Three of them are the reason this file exists, and each is a wrong ANSWER
 * rather than a broken render — the kind that ships because the screen looks
 * fine:
 *
 *   - an empty result that does not name its window reads as "you have never
 *     signed in" when it means "not in the last 30 days"
 *   - a filter that silently refetched would be a query against an endpoint
 *     that has no search parameter
 *   - `total` is the size of the answer, never a count in the database
 */
describe('LoginHistoryCard', () => {
  it('names the window when there is nothing, rather than saying only "none"', async () => {
    fetchHistory.mockResolvedValue({ sessions: [], total: 0, scope: 'self' });

    const screen = await renderScreen(<LoginHistoryCard />);

    await waitFor(() => {
      expect(screen.getByText('No sign-ins recorded')).toBeTruthy();
    });
    // The window is the other half of the answer.
    expect(screen.getByText(/last 30 days/i)).toBeTruthy();
  });

  it('says whose sign-ins these are, because the endpoint scopes to self', async () => {
    fetchHistory.mockResolvedValue({ sessions: [session()], total: 1, scope: 'self' });

    const screen = await renderScreen(<LoginHistoryCard />);

    // A branch manager reading this as the shop's logins is the failure mode:
    // the API pins them to their own uid and says nothing about having done so.
    await waitFor(() => {
      expect(screen.getByText('Your sign-ins on this account')).toBeTruthy();
    });
  });

  it('filters the rows already fetched, without going back to the server', async () => {
    fetchHistory.mockResolvedValue({
      sessions: [
        session({ id: 'a', city: 'Rawalpindi' }),
        session({ id: 'b', city: 'Lahore' }),
      ],
      total: 2,
      scope: 'self',
    });

    const screen = await renderScreen(<LoginHistoryCard />);
    await waitFor(() => expect(screen.getByText(/Rawalpindi/)).toBeTruthy());

    const callsBefore = fetchHistory.mock.calls.length;
    fireEvent.changeText(screen.getByTestId('login-history-search'), 'Lahore');

    await waitFor(() => {
      expect(screen.queryByText(/Rawalpindi/)).toBeNull();
    });
    expect(screen.getByText(/Lahore/)).toBeTruthy();
    // The endpoint takes no search parameter — a refetch here would mean the
    // filter was written as a query it cannot answer.
    expect(fetchHistory.mock.calls.length).toBe(callsBefore);
  });

  it('says rows were left behind when the window hit its ceiling', async () => {
    // `total` is `sessions.length` and can never exceed `limit`, so equality is
    // the only signal that older sign-ins exist and are not shown.
    fetchHistory.mockResolvedValue({
      sessions: Array.from({ length: 100 }, (_, i) => session({ id: `s${i}` })),
      total: 100,
      scope: 'self',
    });

    const screen = await renderScreen(<LoginHistoryCard />);

    await waitFor(() => {
      expect(screen.getByText(/Older ones are not listed/i)).toBeTruthy();
    });
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '<1m'],
    [90_000, '2m'],
    [3_600_000, '1h'],
    [9_000_000, '2h 30m'],
  ])('renders %ims as %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it('does not invent a duration from a bad value', () => {
    // Server-derived; a negative or NaN means the row is odd, not that the
    // session lasted no time.
    expect(formatDuration(-1)).toBe('—');
    expect(formatDuration(Number.NaN)).toBe('—');
  });
});

describe('formatWhere', () => {
  it('uses the country CODE, so the column does not truncate on a phone', () => {
    expect(formatWhere(session())).toBe('Rawalpindi, PK');
  });

  it('falls back to the country name when there is no code', () => {
    expect(formatWhere(session({ countryCode: null }))).toBe('Rawalpindi, Pakistan');
  });

  it('falls back to the IP, because a failed lookup is normal', () => {
    expect(
      formatWhere(session({ city: null, country: null, countryCode: null })),
    ).toBe('203.0.113.9');
  });

  it('says Unknown rather than blank when there is nothing at all', () => {
    expect(
      formatWhere(
        session({ city: null, country: null, countryCode: null, ipAddress: null }),
      ),
    ).toBe('Unknown');
  });
});
