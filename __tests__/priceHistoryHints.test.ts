/**
 * @format
 */
import type { PriceChange } from '@/api';
import {
  groupByMonth,
  inForceIds,
  isBelowCost,
  isFromZero,
  isQuicklyReversed,
  karachiDay,
  matchesPriceFilters,
  priceChangeA11yLabel,
  priceHints,
  priceMove,
} from '@/features/catalog/utils/priceHistoryHints';

function change(over: Partial<PriceChange>): PriceChange {
  return {
    id: 'h1',
    priceNumber: 'PRC-000001',
    productId: 'p1',
    productCode: 'CAKE-005',
    productName: 'Caremal Cake Bento',
    categoryName: 'Cakes',
    oldPrice: 450,
    newPrice: 500,
    effectiveDate: '2026-08-19',
    reason: 'wrong low price',
    source: 'manual',
    status: 'active',
    versionNumber: 1,
    changedBy: 'u1',
    changedByName: 'Super Admin',
    changedOn: '2026-08-19T06:00:00.000Z',
    activatedOn: '2026-08-19T06:00:00.000Z',
    batchId: null,
    ...over,
  };
}

// The four entries the web shows, as the brief describes them.
const caremalUp = change({ id: 'c1', oldPrice: 450, newPrice: 500, effectiveDate: '2026-08-19', changedOn: '2026-08-19T06:00:00.000Z' });
const caremalDown = change({
  id: 'c2',
  priceNumber: 'PRC-000002',
  oldPrice: 500,
  newPrice: 450,
  effectiveDate: '2026-08-21',
  reason: 'wrongly feed',
  versionNumber: 2,
  changedOn: '2026-08-21T06:00:00.000Z',
  activatedOn: '2026-08-21T06:00:00.000Z',
});
const lotus = change({
  id: 'l1',
  priceNumber: 'PRC-000003',
  productId: 'p2',
  productCode: null,
  productName: 'Lotus cake 2 pounds',
  oldPrice: 0,
  newPrice: 1500,
  effectiveDate: '2026-09-19',
  reason: '',
  changedOn: '2026-09-19T06:00:00.000Z',
  activatedOn: '2026-09-19T06:00:00.000Z',
});
const cookies = change({
  id: 'k1',
  priceNumber: 'PRC-000004',
  productId: 'p3',
  productCode: 'COOKIES-001',
  productName: 'Cookies',
  oldPrice: 200,
  newPrice: 150,
  effectiveDate: '2026-09-23',
  reason: 'Change due to old stock',
  changedOn: '2026-09-23T06:00:00.000Z',
  activatedOn: '2026-09-23T06:00:00.000Z',
});
const all = [cookies, lotus, caremalDown, caremalUp];

describe('priceMove', () => {
  it('gives direction, rupee difference and percent of the old price', () => {
    expect(priceMove(cookies)).toEqual({ direction: 'down', diff: -50, pct: -25 });
    expect(priceMove(caremalUp)).toEqual({ direction: 'up', diff: 50, pct: (50 / 450) * 100 });
  });

  it('has no percent from a zero price, and no move without an old price', () => {
    expect(priceMove(lotus)).toEqual({ direction: 'up', diff: 1500, pct: null });
    expect(priceMove(change({ oldPrice: null }))).toEqual({ direction: 'same', diff: null, pct: null });
  });
});

describe('hints', () => {
  it('flags a change from Rs. 0', () => {
    expect(isFromZero(lotus)).toBe(true);
    expect(isFromZero(cookies)).toBe(false);
    expect(isFromZero(change({ oldPrice: null }))).toBe(false);
  });

  it('flags both Caremal entries as reversed within 7 days, and not the others', () => {
    expect(isQuicklyReversed(caremalUp, all)).toBe(true);
    expect(isQuicklyReversed(caremalDown, all)).toBe(true);
    expect(isQuicklyReversed(lotus, all)).toBe(false);
    expect(isQuicklyReversed(cookies, all)).toBe(false);
  });

  it('does not call it a reversal past 7 days, on another product, or in the same direction', () => {
    const late = { ...caremalDown, effectiveDate: '2026-08-27' };
    expect(isQuicklyReversed(caremalUp, [caremalUp, late])).toBe(false);
    expect(isQuicklyReversed(caremalUp, [caremalUp, { ...caremalDown, effectiveDate: '2026-08-26' }])).toBe(true);
    expect(isQuicklyReversed(caremalUp, [caremalUp, { ...caremalDown, productId: 'other' }])).toBe(false);
    expect(isQuicklyReversed(caremalUp, [caremalUp, { ...caremalDown, newPrice: 600 }])).toBe(false);
  });

  it('ignores a superseded change, which never took effect', () => {
    expect(isQuicklyReversed(caremalUp, [caremalUp, { ...caremalDown, status: 'superseded' }])).toBe(false);
    expect(isQuicklyReversed({ ...caremalUp, status: 'superseded' }, all)).toBe(false);
  });

  it('flags below cost only when the cost is known', () => {
    expect(isBelowCost(caremalDown, 500)).toBe(true);
    expect(isBelowCost(caremalUp, 500)).toBe(false);
    expect(isBelowCost(caremalDown, null)).toBe(false);
    expect(isBelowCost(caremalDown, undefined)).toBe(false);
  });

  it('collects the hints as text labels', () => {
    expect(priceHints(lotus, all, null).map((h) => h.label)).toEqual(['From Rs. 0']);
    expect(priceHints(caremalDown, all, 500).map((h) => h.label)).toEqual(['Reversed within 7 days', 'Below cost']);
    expect(priceHints(caremalUp, all, 500).map((h) => h.label)).toEqual(['Reversed within 7 days']);
    expect(priceHints(cookies, all, 100)).toEqual([]);
  });
});

describe('inForceIds', () => {
  it('marks the latest applied change of each product', () => {
    const ids = inForceIds(all);
    expect([...ids].sort()).toEqual(['c2', 'k1', 'l1']);
  });

  it('never marks a scheduled or superseded change', () => {
    const scheduled = change({ id: 's1', status: 'scheduled', activatedOn: null, changedOn: '2026-10-01T06:00:00.000Z' });
    expect(inForceIds([scheduled, caremalUp]).has('s1')).toBe(false);
    expect(inForceIds([scheduled, caremalUp]).has('c1')).toBe(true);
  });
});

describe('groupByMonth', () => {
  it('groups by the Karachi month it was recorded in, newest first', () => {
    const sections = groupByMonth(all);
    expect(sections.map((s) => s.title)).toEqual(['September 2026', 'August 2026']);
    expect(sections[0]!.data.map((c) => c.id)).toEqual(['k1', 'l1']);
  });

  it('uses Karachi time, not UTC, at a month boundary', () => {
    // 21:00 UTC on 31 Aug is 02:00 on 1 Sep in Karachi.
    expect(karachiDay('2026-08-31T21:00:00.000Z')).toBe('2026-09-01');
    expect(groupByMonth([change({ changedOn: '2026-08-31T21:00:00.000Z' })])[0]!.title).toBe('September 2026');
  });
});

describe('matchesPriceFilters', () => {
  it('filters by effective date window, inclusive', () => {
    expect(matchesPriceFilters(cookies, { from: '2026-09-23', to: '2026-09-23' })).toBe(true);
    expect(matchesPriceFilters(cookies, { from: '2026-09-24' })).toBe(false);
    expect(matchesPriceFilters(cookies, { to: '2026-09-22' })).toBe(false);
  });

  it('filters by who, direction and source', () => {
    expect(matchesPriceFilters(cookies, { changedBy: 'Super Admin' })).toBe(true);
    expect(matchesPriceFilters(cookies, { changedBy: 'Someone else' })).toBe(false);
    expect(matchesPriceFilters(cookies, { direction: 'down' })).toBe(true);
    expect(matchesPriceFilters(cookies, { direction: 'up' })).toBe(false);
    expect(matchesPriceFilters(cookies, { source: 'import' })).toBe(false);
    expect(matchesPriceFilters(cookies, { source: 'manual' })).toBe(true);
  });
});

describe('priceChangeA11yLabel', () => {
  it('reads the card as one line, as the brief words it', () => {
    expect(priceChangeA11yLabel(cookies)).toBe(
      'Cookies, COOKIES-001, price down from 200 to 150 rupees, 25 percent, effective 23 September, reason: change due to old stock, active',
    );
  });

  it('says when there is no code or reason, and reads the hints', () => {
    const label = priceChangeA11yLabel(lotus, priceHints(lotus, all, null));
    expect(label).toBe('Lotus cake 2 pounds, no code, price up from 0 to 1,500 rupees, effective 19 September, no reason given, active, From Rs. 0');
  });
});
