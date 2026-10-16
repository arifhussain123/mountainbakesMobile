/**
 * @format
 */
import { TAB_ITEMS } from '@/navigation/tabItems';

describe('TAB_ITEMS', () => {
  it('has exactly 5 slots: 4 navigable tabs + More', () => {
    expect(TAB_ITEMS).toHaveLength(5);
  });

  it('"More" has no route and never becomes active — the bar treats route === null as "open drawer, skip the notch"', () => {
    const more = TAB_ITEMS[TAB_ITEMS.length - 1]!;
    expect(more.key).toBe('more');
    expect(more.route).toBeNull();
  });

  it('every other tab has a real, distinct route', () => {
    const routes = TAB_ITEMS.slice(0, -1).map((t) => t.route);
    expect(routes.every((r) => typeof r === 'string' && r.length > 0)).toBe(true);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('has distinct keys across all 5 slots', () => {
    const keys = TAB_ITEMS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
