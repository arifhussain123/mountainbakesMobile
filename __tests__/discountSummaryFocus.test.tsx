/**
 * @format
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// The screen's focus callback, captured so a test can "return to" the screen.
let mockFocus: (() => void) | null = null;
let mockToday = '2026-10-18';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = jest.requireActual('react');
    mockFocus = cb;
    // react-navigation runs the callback when the screen first gains focus.
    useEffect(() => cb(), [cb]);
  },
}));

jest.mock('@/api', () => ({ getBusinessDate: () => mockToday }));

import { summaryFocusAction, useSummaryFocusRefresh } from '@/features/discounts/hooks/useSummaryFocusRefresh';

describe('summaryFocusAction', () => {
  const base = { renderedDate: '2026-10-18', today: '2026-10-18', isStale: true, isFetching: false };

  it('refetches stale figures on the same business day', () => {
    expect(summaryFocusAction(base)).toBe('refetch');
  });

  it('leaves fresh figures alone', () => {
    expect(summaryFocusAction({ ...base, isStale: false })).toBe('none');
  });

  it('sends no second request while one is in flight', () => {
    expect(summaryFocusAction({ ...base, isFetching: true })).toBe('none');
  });

  it('re-keys, not refetches, once the business day (and month) has turned', () => {
    expect(summaryFocusAction({ ...base, renderedDate: '2026-10-31', today: '2026-11-01' })).toBe('rekey');
    expect(summaryFocusAction({ ...base, renderedDate: '2026-12-31', today: '2027-01-01', isStale: false })).toBe('rekey');
  });
});

describe('useSummaryFocusRefresh', () => {
  let renders = 0;
  const refetch = jest.fn();
  let query = { isStale: true, isFetching: false, refetch };

  function Harness() {
    renders += 1;
    useSummaryFocusRefresh(query);
    return null;
  }

  beforeEach(() => {
    renders = 0;
    refetch.mockClear();
    mockFocus = null;
    mockToday = '2026-10-18';
    query = { isStale: true, isFetching: false, refetch };
  });

  function mount() {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<Harness />);
    });
    return renderer;
  }

  it('does nothing on the first focus — the mount already fetches', () => {
    const r = mount();
    expect(refetch).not.toHaveBeenCalled();
    ReactTestRenderer.act(() => r.unmount());
  });

  it('refetches stale figures when the screen is returned to', () => {
    const r = mount();
    ReactTestRenderer.act(() => mockFocus!());
    expect(refetch).toHaveBeenCalledTimes(1);
    ReactTestRenderer.act(() => r.unmount());
  });

  it('does not refetch figures that are still fresh', () => {
    query = { ...query, isStale: false };
    const r = mount();
    ReactTestRenderer.act(() => mockFocus!());
    expect(refetch).not.toHaveBeenCalled();
    ReactTestRenderer.act(() => r.unmount());
  });

  it('re-renders on a new business day so the new month\'s key is fetched, without refetching the old one', () => {
    const r = mount();
    const before = renders;
    mockToday = '2026-11-01';
    ReactTestRenderer.act(() => mockFocus!());
    expect(refetch).not.toHaveBeenCalled();
    expect(renders).toBe(before + 1);
    ReactTestRenderer.act(() => r.unmount());
  });
});
