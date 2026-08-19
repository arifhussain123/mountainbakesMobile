import * as components from '../index';

/**
 * The component set, as a surface rather than one behaviour at a time.
 *
 * `components.test.tsx` next door asserts what individual components *do*. This
 * asserts what the set *is*: that every name the app is built from is reachable
 * from the barrel. Screens import from `@/components` and never from a file
 * path, so a component that exists but is not re-exported is one no screen can
 * use — and that failure shows up as a blank render on one screen rather than
 * as a build error.
 *
 * The other half of the contract — that no component reads a colour from a
 * literal instead of the theme — is `scripts/check-theme-tokens.sh`, run by
 * `npm run verify`. It lives there rather than here because it reads the source
 * tree, and this project's TS config has no Node types.
 */

const REQUIRED = [
  'MBButton',
  'MBInput',
  'MBSelect',
  'MBCard',
  'MBHeader',
  'MBStatCard',
  'MBSearchBar',
  'MBDateFilter',
  'MBEmptyState',
  'MBErrorState',
  'MBLoading',
  'MBSkeleton',
  'MBOfflineBanner',
  'MBSyncStatus',
  'MBModal',
  'MBConfirmDialog',
  'MBDataRow',
  'MBProductCard',
  'MBSaleItem',
  'MBOrderCard',
  'MBStockCard',
  'MBExpenseCard',
] as const;

describe('component surface', () => {
  it.each(REQUIRED)('exports %s from the barrel', name => {
    // Screens import from '@/components', never from a file path. A component
    // that exists but is not re-exported is one a screen cannot use.
    expect(components[name as keyof typeof components]).toBeDefined();
  });

  it('exports every component as a function', () => {
    // React.memo returns an object rather than a function, so both shapes pass —
    // what is being excluded is `undefined`, which a broken re-export produces
    // silently and which only fails at render time on one screen.
    for (const name of REQUIRED) {
      const value = components[name as keyof typeof components];
      expect(['function', 'object']).toContain(typeof value);
    }
  });

});