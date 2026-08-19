import React from 'react';
import { MBHeader } from '@/components/common/MBHeader';
import { MBOfflineBanner } from '@/components/feedback/MBOfflineBanner';
import { useNetworkStore } from '@/store/networkStore';
import { renderScreen } from '@/test-utils/render';
import { dataAsOfFrom } from '@/utils/dataAsOf';

/**
 * The offline state is two claims, and the second one is the one that was
 * missing: *this is what I have, and this is how old it is.*
 *
 * `MBOfflineBanner` has always rendered "Showing data from HH:MM" when given a
 * `dataAsOf`, but nothing passed one — `MBHeader` called it bare and no screen
 * had the prop. The line was unreachable. These tests pin the wiring, because a
 * dead branch is exactly the kind of thing that gets quietly deleted later as
 * unused.
 *
 * Why it matters: "no sales today" and "I have not been able to ask since 09:14"
 * look identical on a screen showing an empty list. The first is information;
 * the second is a reason to check before ringing a sale up a second time.
 */

function setNetwork(isOnline: boolean, hasResolved = true) {
  useNetworkStore.setState({ isOnline, hasResolved });
}

const ONLINE = { isOnline: true, hasResolved: true };

afterEach(() => useNetworkStore.setState(ONLINE));

describe('offline banner', () => {
  it('says nothing while online, however stale the data', async () => {
    setNetwork(true);
    const s = await renderScreen(<MBOfflineBanner dataAsOf="09:14" />);
    expect(s.queryByText(/Showing data from/)).toBeNull();
    expect(s.queryByText(/Offline/)).toBeNull();
  });

  /**
   * NetInfo reports asynchronously. Before it has, the app must not accuse the
   * device of being offline — a banner that flashes on every cold start is a
   * banner staff learn to ignore.
   */
  it('says nothing before NetInfo has reported once', async () => {
    setNetwork(false, false);
    const s = await renderScreen(<MBOfflineBanner dataAsOf="09:14" />);
    expect(s.queryByText(/Offline/)).toBeNull();
  });

  it('shows how old the data is when offline', async () => {
    setNetwork(false);
    const s = await renderScreen(<MBOfflineBanner dataAsOf="09:14" />);
    expect(s.getByText(/Offline/)).toBeTruthy();
    expect(s.getByText('Showing data from 09:14')).toBeTruthy();
  });

  /**
   * A screen with nothing cached passes no timestamp. It still says it is
   * offline — it just makes no claim about data it does not have.
   */
  it('omits the timestamp when the screen has no cached data', async () => {
    setNetwork(false);
    const s = await renderScreen(<MBOfflineBanner />);
    expect(s.getByText(/Offline/)).toBeTruthy();
    expect(s.queryByText(/Showing data from/)).toBeNull();
  });
});

describe('MBHeader forwards it', () => {
  /**
   * This is the link that was broken. `MBHeader` renders the banner itself so no
   * screen has to remember to, and it called it with no props — so every screen
   * that "had" an offline state had one that could never show a timestamp.
   */
  it('passes dataAsOf through to the banner', async () => {
    setNetwork(false);
    const s = await renderScreen(<MBHeader title="Stock" dataAsOf="09:14" />);
    expect(s.getByText('Showing data from 09:14')).toBeTruthy();
  });

  it('still renders the plain offline strip when a screen passes nothing', async () => {
    setNetwork(false);
    const s = await renderScreen(<MBHeader title="Stock" />);
    expect(s.getByText(/Offline/)).toBeTruthy();
    expect(s.queryByText(/Showing data from/)).toBeNull();
  });
});

describe('dataAsOfFrom', () => {
  /**
   * Karachi, not device time. Every other clock in this app is the business
   * clock, and a stale-data stamp that silently used the phone's timezone would
   * be the one that disagreed — on a device set elsewhere, precisely the reading
   * that makes data look fresher or older than it is.
   */
  it('formats a timestamp as Karachi HH:mm', () => {
    // 2026-08-19T04:14:00Z === 09:14 in Karachi (UTC+5).
    expect(dataAsOfFrom(Date.UTC(2026, 7, 19, 4, 14))).toBe('09:14');
  });

  it('rolls the clock with the +5 offset rather than showing UTC', () => {
    // 21:30 UTC is 02:30 the NEXT day in Karachi.
    expect(dataAsOfFrom(Date.UTC(2026, 7, 19, 21, 30))).toBe('02:30');
  });

  /**
   * `dataUpdatedAt` is 0 until a query first resolves. There is no "as of" for
   * data that never arrived, and rendering the epoch as a time would be a lie.
   */
  it('returns undefined when the query has never resolved', () => {
    expect(dataAsOfFrom(0)).toBeUndefined();
    expect(dataAsOfFrom(undefined)).toBeUndefined();
  });
});
