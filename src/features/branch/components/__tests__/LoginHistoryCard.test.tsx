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

/**
 * A session as the API returns it.
 *
 * Typed as the real `LoginSession` rather than a loose object on purpose: it is
 * what caught migration 98 widening the type under this file, which is exactly
 * the drift the mirrored `src/shared` tree is prone to. Note `userEmail` is
 * MASKED here: the list endpoint reveals the address only to a super admin, and
 * this card is the shop floor's own history — so a fixture carrying a real
 * address would be testing against a response these callers never receive.
 */
function session(over: Partial<LoginSession> = {}): LoginSession {
  return {
    id: 'sess-1',
    userId: 'u1',
    userCode: 'MBU-000125',
    userEmail: 's***@mountainbakes.pk',
    emailMasked: true,
    userName: 'Shift User',
    userRole: 'branch_user',
    branchId: 'b1',
    branchName: 'Committee Chowk',
    authSessionId: 'auth-sess-1',
    ipAddress: '203.0.113.9',
    userAgent: 'Android 13',
    browser: 'Chrome',
    browserVersion: '140',
    os: 'Android',
    osVersion: '13',
    deviceType: 'mobile',
    deviceName: 'SM-A546E',
    screenSize: '412x915',
    country: 'Pakistan',
    countryCode: 'PK',
    city: 'Rawalpindi',
    region: 'Punjab',
    timezone: 'Asia/Karachi',
    // Migration 99 widened the row again — the fixture names the provenance
    // explicitly rather than leaning on a default, because 'IP' vs 'UNKNOWN' is
    // the distinction the column exists to carry.
    locationSource: 'IP',
    latitude: 33.5651,
    longitude: 73.0169,
    loginAt: '2026-08-28T04:10:00.000Z',
    lastSeenAt: '2026-08-28T06:40:00.000Z',
    endedAt: null,
    endReason: null,
    revokedAt: null,
    revokedByName: null,
    revokeReason: null,
    isSuspicious: false,
    suspiciousReason: null,
    date: '2026-08-28',
    state: 'active',
    durationMs: 9_000_000,
    canRevoke: true,
    ...over,
  };
}

/** The paged envelope the endpoint returns since migration 98. */
function page(sessions: LoginSession[], total = sessions.length) {
  return { sessions, total, page: 1, pageSize: 100, scope: 'self' as const };
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
 *   - an empty result that does not name what it searched reads as "you have
 *     never signed in" when it means "nothing on this page"
 *   - a filter that silently refetched would be a query against a `search`
 *     parameter that matches nothing a branch account can distinguish
 *   - `total` is the count in the DATABASE since migration 98, not the size of
 *     the answer — so "older ones are not listed" is now a real comparison
 *     rather than an equality against a row ceiling
 */
describe('LoginHistoryCard', () => {
  it('names the window when there is nothing, rather than saying only "none"', async () => {
    fetchHistory.mockResolvedValue(page([]));

    const screen = await renderScreen(<LoginHistoryCard />);

    await waitFor(() => {
      expect(screen.getByText('No sign-ins recorded')).toBeTruthy();
    });
    // What was searched is the other half of the answer.
    expect(screen.getByText(/all sign-ins/i)).toBeTruthy();
  });

  it('says whose sign-ins these are, because the endpoint scopes to self', async () => {
    fetchHistory.mockResolvedValue(page([session()]));

    const screen = await renderScreen(<LoginHistoryCard />);

    // A branch manager reading this as the shop's logins is the failure mode:
    // the API pins them to their own uid and says nothing about having done so.
    await waitFor(() => {
      expect(screen.getByText('Your sign-ins on this account')).toBeTruthy();
    });
  });

  it('filters the rows already fetched, without going back to the server', async () => {
    fetchHistory.mockResolvedValue(
      page([session({ id: 'a', city: 'Rawalpindi' }), session({ id: 'b', city: 'Lahore' })]),
    );

    const screen = await renderScreen(<LoginHistoryCard />);
    await waitFor(() => expect(screen.getByText(/Rawalpindi/)).toBeTruthy());

    const callsBefore = fetchHistory.mock.calls.length;
    fireEvent.changeText(screen.getByTestId('login-history-search'), 'Lahore');

    await waitFor(() => {
      expect(screen.queryByText(/Rawalpindi/)).toBeNull();
    });
    expect(screen.getByText(/Lahore/)).toBeTruthy();
    // The endpoint's `search` matches the staff code and name, and every row a
    // branch account sees carries its own — a refetch here would mean the filter
    // was written as a query that cannot answer it.
    expect(fetchHistory.mock.calls.length).toBe(callsBefore);
  });

  it('says rows were left behind when the database holds more than this page', async () => {
    // `total` counts matching rows in the database since migration 98, so a page
    // of 100 out of 412 is a real comparison — not the equality-against-a-ceiling
    // guess this assertion used to make.
    fetchHistory.mockResolvedValue(
      page(Array.from({ length: 100 }, (_, i) => session({ id: `s${i}` })), 412),
    );

    const screen = await renderScreen(<LoginHistoryCard />);

    await waitFor(() => {
      expect(screen.getByText(/Older ones are not listed/i)).toBeTruthy();
    });
  });

  it('names an admin sign-out for what it was, not as an ordinary one', async () => {
    // The account holder needs to know somebody else ended the session; an
    // ordinary "Signed out" would read as their own action.
    fetchHistory.mockResolvedValue(
      page([session({ state: 'revoked', endedAt: '2026-08-28T07:00:00.000Z', endReason: 'revoked' })]),
    );

    const screen = await renderScreen(<LoginHistoryCard />);

    await waitFor(() => {
      expect(screen.getByText('Signed out by admin')).toBeTruthy();
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
